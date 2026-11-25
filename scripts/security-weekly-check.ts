/**
 * Haftalık güvenlik kontrolü: sunucu sertleştirme, HTTP başlıkları, hassas dosya
 * sızıntısı, bağımlılık açıkları (npm audit) ve 6 Kasım 2026 denetim bulgularının
 * kodda hâlâ açık olup olmadığını kontrol eder; sonucu e-posta ile gönderir.
 *
 * Sunucuda root olarak çalışır (sshd/ufw/ss/docker okur, hiçbir şeyi değiştirmez).
 * Çalıştır: npx tsx scripts/security-weekly-check.ts [--full] [--to adres] [--dry-run]
 *   --full     6 Kasım denetiminin tüm bulgularını ve önlemlerini de ekler
 *   --dry-run  e-posta göndermez, HTML'i stdout'a yazar
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { sendCompanyMail } from "../lib/email";
import { getCompanySettings } from "../lib/queries/company-settings";
import { AUDIT_2026_11_06, type AuditFinding } from "./security-audit-2026-11-06";

const APP_DIR = process.cwd();
const SITE = "https://www.tatildeyiz.com.tr";
const DEFAULT_TO = "info@tatildeyiz.com.tr";

type Status = "ok" | "open" | "warn" | "unknown";

type CheckResult = {
  group: string;
  name: string;
  status: Status;
  detail: string;
  findingId?: string;
};

const results: CheckResult[] = [];

function add(r: CheckResult) {
  results.push(r);
}

function sh(cmd: string, timeoutMs = 60_000): string {
  try {
    return execFileSync("bash", ["-lc", cmd], {
      encoding: "utf8",
      timeout: timeoutMs,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    const e = error as { stdout?: string };
    return typeof e.stdout === "string" ? e.stdout : "";
  }
}

function readApp(rel: string): string | null {
  const full = path.join(APP_DIR, rel);
  return existsSync(full) ? readFileSync(full, "utf8") : null;
}

function walk(dir: string, match: (file: string) => boolean, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, match, out);
    else if (match(full)) out.push(full);
  }
  return out;
}

async function head(url: string): Promise<{ status: number; headers: Headers } | null> {
  try {
    const res = await fetch(url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(20_000) });
    await res.body?.cancel();
    return { status: res.status, headers: res.headers };
  } catch {
    return null;
  }
}

function checkServer() {
  const g = "Sunucu";
  const sshd = sh("sshd -T 2>/dev/null");
  const root = /^permitrootlogin\s+(\S+)/m.exec(sshd)?.[1] ?? "";
  const pass = /^passwordauthentication\s+(\S+)/m.exec(sshd)?.[1] ?? "";
  if (!sshd) {
    add({ group: g, name: "SSH yapılandırması", status: "unknown", detail: "sshd -T okunamadı" });
  } else {
    add({
      group: g,
      name: "SSH root girişi",
      status: root === "yes" ? "open" : "ok",
      detail: `PermitRootLogin ${root}`,
      findingId: "Y8",
    });
    add({
      group: g,
      name: "SSH şifreyle giriş",
      status: pass === "yes" ? "open" : "ok",
      detail: `PasswordAuthentication ${pass}`,
      findingId: "Y8",
    });
  }

  const listeners = sh("ss -tlnH")
    .split("\n")
    .map((line) => line.trim().split(/\s+/)[3] ?? "")
    .filter(Boolean)
    .filter((addr) => /^(0\.0\.0\.0|\*|\[::\]):/.test(addr))
    .map((addr) => addr.split(":").pop() ?? "")
    .filter((port) => !["22", "80", "443"].includes(port));
  const extra = [...new Set(listeners)];
  add({
    group: g,
    name: "Tüm arayüzlerde dinleyen ek portlar",
    status: extra.length ? "warn" : "ok",
    detail: extra.length ? `Açık: ${extra.join(", ")} (UFW kapalı tutmalı; 127.0.0.1'e bağlayın)` : "Yalnızca 22/80/443",
    findingId: extra.length ? "D7" : undefined,
  });

  const dockerPorts = sh("docker ps --format '{{.Names}} {{.Ports}}' 2>/dev/null")
    .split("\n")
    .filter((line) => /0\.0\.0\.0:|\[::\]:|:::/.test(line));
  add({
    group: g,
    name: "Docker dışa açık port",
    status: dockerPorts.length ? "open" : "ok",
    detail: dockerPorts.length ? dockerPorts.join(" | ") : "Postgres/WAHA/Evolution yalnızca 127.0.0.1",
  });

  const ufw = sh("ufw status 2>/dev/null");
  const ufwActive = /Status:\s+active/i.test(ufw);
  const webAnywhere = /^(80|443)\/tcp\s+ALLOW\s+Anywhere/m.test(ufw);
  add({ group: g, name: "UFW güvenlik duvarı", status: ufwActive ? "ok" : "open", detail: ufwActive ? "Aktif" : "Kapalı" });
  add({
    group: g,
    name: "Origin yalnızca Cloudflare'e açık mı",
    status: webAnywhere ? "open" : "ok",
    detail: webAnywhere ? "80/443 her yerden açık; Cloudflare atlanabilir" : "80/443 kısıtlı",
    findingId: "Y9",
  });

  const f2b = sh("fail2ban-client status 2>/dev/null");
  add({
    group: g,
    name: "fail2ban",
    status: /sshd/.test(f2b) ? "ok" : "warn",
    detail: /sshd/.test(f2b) ? "sshd jail aktif" : "sshd jail bulunamadı",
  });

  const tokens = sh("nginx -T 2>/dev/null | grep -E '^\\s*server_tokens\\s+off' | head -n1");
  add({
    group: g,
    name: "nginx sürüm gizleme",
    status: tokens.trim() ? "ok" : "warn",
    detail: tokens.trim() ? "server_tokens off" : "server_tokens off tanımlı değil",
    findingId: tokens.trim() ? undefined : "D4",
  });

  const upgradable = sh("apt list --upgradable 2>/dev/null | grep -ci security", 120_000).trim();
  const secCount = Number.parseInt(upgradable || "0", 10) || 0;
  add({
    group: g,
    name: "Bekleyen güvenlik güncellemeleri (apt)",
    status: secCount > 0 ? "warn" : "ok",
    detail: secCount > 0 ? `${secCount} paket` : "Yok",
  });

  const certEnd = sh(
    "echo | openssl s_client -servername www.tatildeyiz.com.tr -connect www.tatildeyiz.com.tr:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null"
  );
  const end = /notAfter=(.+)/.exec(certEnd)?.[1];
  if (end) {
    const days = Math.floor((new Date(end).getTime() - Date.now()) / 86_400_000);
    add({
      group: g,
      name: "TLS sertifika süresi",
      status: days < 14 ? "open" : days < 30 ? "warn" : "ok",
      detail: `${days} gün kaldı`,
    });
  }
}

async function checkHttp() {
  const g = "Canlı site";
  const home = await head(`${SITE}/`);
  if (!home) {
    add({ group: g, name: "Ana sayfa erişimi", status: "open", detail: "Site yanıt vermedi" });
    return;
  }
  const h = home.headers;
  const want: [string, string, string | undefined][] = [
    ["strict-transport-security", "HSTS", undefined],
    ["x-content-type-options", "X-Content-Type-Options", undefined],
    ["x-frame-options", "X-Frame-Options", undefined],
    ["content-security-policy", "Content-Security-Policy", "O3"],
  ];
  for (const [key, label, fid] of want) {
    const present = h.has(key);
    add({
      group: g,
      name: `${label} başlığı`,
      status: present ? "ok" : fid ? "warn" : "open",
      detail: present ? "Var" : "Yok",
      findingId: present ? undefined : fid,
    });
  }
  add({
    group: g,
    name: "X-Powered-By sızıntısı",
    status: h.has("x-powered-by") ? "warn" : "ok",
    detail: h.get("x-powered-by") ?? "Gizli",
    findingId: h.has("x-powered-by") ? "D4" : undefined,
  });

  for (const p of ["/.env", "/.env.local", "/.git/HEAD", "/backup.sql", "/package.json", "/prisma/schema.prisma"]) {
    const r = await head(`${SITE}${p}`);
    const leaked = r?.status === 200;
    add({
      group: g,
      name: `Hassas dosya ${p}`,
      status: leaked ? "open" : "ok",
      detail: r ? `HTTP ${r.status}` : "Yanıt yok",
    });
  }

  const adminApi = await head(`${SITE}/api/admin/booking-report`);
  add({
    group: g,
    name: "www üzerinde /api/admin erişimi",
    status: adminApi && adminApi.status !== 404 ? "warn" : "ok",
    detail: adminApi ? `HTTP ${adminApi.status}` : "Yanıt yok",
    findingId: adminApi && adminApi.status !== 404 ? "D5" : undefined,
  });
}

function checkCode() {
  const g = "Kod (bilinen bulgular)";

  const conf = readApp("lib/queries/booking-confirmation.ts");
  if (conf) {
    const open = /if\s*\(\s*!mail\s*\)\s*return\s+true/.test(conf);
    add({ group: g, name: "/onay e-posta atlaması", status: open ? "open" : "ok", detail: open ? "mail boşken eşleşme true dönüyor" : "Kapatılmış", findingId: "K1" });
  }

  const adminRoutes = walk(path.join(APP_DIR, "app/api/admin"), (f) => f.endsWith("route.ts"));
  const noRole = adminRoutes.filter((f) => !/requireAdmin|requireManager|STAFF_ROLES|isStaffRole|assertStaff/.test(readFileSync(f, "utf8")));
  add({
    group: g,
    name: "Admin API rol kontrolü",
    status: noRole.length ? "open" : "ok",
    detail: noRole.length
      ? `${noRole.length}/${adminRoutes.length} rota rol kontrolsüz: ${noRole.slice(0, 6).map((f) => path.relative(APP_DIR, path.dirname(f)).replace(/\\/g, "/").replace("app/api/admin/", "")).join(", ")}${noRole.length > 6 ? "…" : ""}`
      : `${adminRoutes.length} rotanın hepsi rol kontrollü`,
    findingId: "K2",
  });

  const iyzico = readApp("lib/payments/finalize-booking-iyzico-payment.ts");
  if (iyzico) {
    const open = /retrieve\.signature\s*&&/.test(iyzico);
    add({ group: g, name: "iyzico imza/oturum doğrulaması", status: open ? "open" : "ok", detail: open ? "İmza isteğe bağlı" : "İmza zorunlu", findingId: "K3" });
  }

  const y360 = readApp("app/api/yolcu360/payment/route.ts");
  if (y360) {
    const fixed = /paymentType\s*:\s*["']creditCard["']/.test(y360);
    add({ group: g, name: "Yolcu360 ödeme tipi sabitleme", status: fixed ? "ok" : "open", detail: fixed ? "creditCard sabit" : "paymentType istemciden geliyor", findingId: "K4" });
  }

  const pkg = readApp("package.json") ?? "";
  const hasSanitizer = /"(sanitize-html|isomorphic-dompurify|dompurify)"/.test(pkg);
  add({ group: g, name: "HTML temizleyici kütüphanesi", status: hasSanitizer ? "ok" : "open", detail: hasSanitizer ? "Var" : "Yok (regex temizleyici)", findingId: "Y3" });

  const tsx = walk(path.join(APP_DIR, "app"), (f) => f.endsWith(".tsx")).concat(walk(path.join(APP_DIR, "components"), (f) => f.endsWith(".tsx")));
  const unsafeLd = tsx.filter((f) => {
    const src = readFileSync(f, "utf8");
    return /dangerouslySetInnerHTML=\{\{\s*__html:\s*JSON\.stringify\(/.test(src) && !/u003c/.test(src);
  });
  add({
    group: g,
    name: "JSON-LD </script> kaçışı",
    status: unsafeLd.length ? "open" : "ok",
    detail: unsafeLd.length ? `${unsafeLd.length} dosyada kaçışsız JSON.stringify` : "Kaçış uygulanıyor",
    findingId: "Y4",
  });

  const nextCfg = readApp("next.config.ts") ?? "";
  add({
    group: g,
    name: "poweredByHeader kapalı",
    status: /poweredByHeader:\s*false/.test(nextCfg) ? "ok" : "warn",
    detail: /poweredByHeader:\s*false/.test(nextCfg) ? "Kapalı" : "Tanımlı değil",
    findingId: "D4",
  });

  const waha = readApp("scripts/deploy/waha-setup.sh") ?? "";
  const hardcoded = /WAHA_API_KEY:-[A-Za-z0-9]{8,}/.test(waha);
  add({ group: g, name: "WAHA anahtarı repoda", status: hardcoded ? "open" : "ok", detail: hardcoded ? "Varsayılan anahtar kodda" : "Yok", findingId: "Y12" });

  const compose = readApp("docker-compose.yml") ?? "";
  const dbPublic = /^\s*-\s*["']?5432:5432/m.test(compose);
  add({ group: g, name: "docker-compose Postgres portu", status: dbPublic ? "warn" : "ok", detail: dbPublic ? "Repo dosyası 0.0.0.0:5432 yayınlıyor" : "127.0.0.1 veya yayınsız", findingId: "D8" });
}

type AuditSummary = { critical: number; high: number; moderate: number; low: number; top: string[]; nextVersion: string };

function checkDependencies(): AuditSummary | null {
  const g = "Bağımlılıklar";
  const raw = sh(`cd ${JSON.stringify(APP_DIR)} && npm audit --omit=dev --json 2>/dev/null`, 180_000);
  let nextVersion = "?";
  try {
    nextVersion = JSON.parse(readFileSync(path.join(APP_DIR, "node_modules/next/package.json"), "utf8")).version;
  } catch {}
  try {
    const data = JSON.parse(raw) as {
      metadata?: { vulnerabilities?: Record<string, number> };
      vulnerabilities?: Record<string, { severity: string; isDirect?: boolean }>;
    };
    const v = data.metadata?.vulnerabilities ?? {};
    const top = Object.entries(data.vulnerabilities ?? {})
      .filter(([, info]) => info.severity === "critical" || info.severity === "high")
      .sort((a, b) => (a[1].severity === "critical" ? -1 : 1) - (b[1].severity === "critical" ? -1 : 1))
      .map(([name, info]) => `${name} (${info.severity === "critical" ? "kritik" : "yüksek"})`);
    const summary: AuditSummary = {
      critical: v.critical ?? 0,
      high: v.high ?? 0,
      moderate: v.moderate ?? 0,
      low: v.low ?? 0,
      top,
      nextVersion,
    };
    add({
      group: g,
      name: "npm audit (üretim bağımlılıkları)",
      status: summary.critical ? "open" : summary.high ? "warn" : "ok",
      detail: `${summary.critical} kritik, ${summary.high} yüksek, ${summary.moderate} orta · Next.js ${nextVersion}`,
      findingId: "K5",
    });
    return summary;
  } catch {
    add({ group: g, name: "npm audit", status: "unknown", detail: "npm audit çalıştırılamadı" });
    return null;
  }
}

function esc(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

const STATUS_LABEL: Record<Status, string> = { ok: "TAMAM", open: "AÇIK", warn: "UYARI", unknown: "BİLİNMİYOR" };
const STATUS_COLOR: Record<Status, string> = { ok: "#1a7f37", open: "#cf222e", warn: "#9a6700", unknown: "#57606a" };
const SEV_COLOR: Record<AuditFinding["sev"], string> = { Kritik: "#cf222e", Yüksek: "#bc4c00", Orta: "#9a6700", Düşük: "#57606a" };

function buildHtml(audit: AuditSummary | null, full: boolean, runAt: string) {
  const open = results.filter((r) => r.status === "open").length;
  const warn = results.filter((r) => r.status === "warn").length;
  const ok = results.filter((r) => r.status === "ok").length;
  const groups = [...new Set(results.map((r) => r.group))];
  const td = "padding:6px 10px;border-bottom:1px solid #d0d7de;vertical-align:top;font-size:13px";

  const tables = groups
    .map((grp) => {
      const rows = results
        .filter((r) => r.group === grp)
        .map(
          (r) =>
            `<tr><td style="${td};white-space:nowrap;font-weight:600;color:${STATUS_COLOR[r.status]}">${STATUS_LABEL[r.status]}</td><td style="${td}">${esc(r.name)}${r.findingId ? ` <span style="color:#57606a">(${r.findingId})</span>` : ""}</td><td style="${td};color:#424a53">${esc(r.detail)}</td></tr>`
        )
        .join("");
      return `<h3 style="margin:20px 0 6px;font-size:15px">${esc(grp)}</h3><table style="border-collapse:collapse;width:100%">${rows}</table>`;
    })
    .join("");

  const depList =
    audit && audit.top.length
      ? `<p style="font-size:13px;color:#424a53">Kritik/yüksek paketler: ${esc(audit.top.slice(0, 15).join(", "))}</p>`
      : "";

  const fullSection = full
    ? `<h2 style="margin:28px 0 6px;font-size:17px">6 Kasım 2026 denetimi — tüm bulgular ve önlemler</h2>
<p style="font-size:13px;color:#424a53">Kaynak kod incelemesi, npm audit, sunucu yapılandırmasının salt-okunur kontrolü ve canlı sitenin zararsız HTTP yanıtları. Canlı sisteme istismar denemesi yapılmadı.</p>
${AUDIT_2026_11_06.map(
  (f) => `<div style="margin:12px 0;padding:10px 12px;border-left:3px solid ${SEV_COLOR[f.sev]};background:#f6f8fa">
<div style="font-size:14px;font-weight:600"><span style="color:${SEV_COLOR[f.sev]}">${f.sev}</span> · ${f.id} · ${esc(f.title)}</div>
<div style="font-size:12px;color:#57606a;margin:4px 0">${esc(f.where)}</div>
<div style="font-size:13px;margin:4px 0"><b>Sorun:</b> ${esc(f.problem)}</div>
<div style="font-size:13px;margin:4px 0"><b>Önlem:</b> ${esc(f.fix)}</div></div>`
).join("")}
<h3 style="margin:20px 0 6px;font-size:15px">Düzeltme planı</h3>
<ul style="font-size:13px"><li><b>Acil (0-24 saat):</b> K1, K2, K3, K4, Y8, Y12</li><li><b>Bu hafta:</b> K5, Y1-Y6, Y9-Y11</li><li><b>Bu ay:</b> Y7, tüm Orta ve Düşük bulgular; ardından harici sızma testi</li></ul>`
    : "";

  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#1f2328;max-width:900px">
<h2 style="margin:0 0 4px;font-size:19px">tatildeyiz.com.tr haftalık güvenlik kontrolü</h2>
<p style="margin:0 0 12px;color:#57606a;font-size:13px">${esc(runAt)} · otomatik kontrol (salt-okunur)</p>
<p style="font-size:15px"><b style="color:${STATUS_COLOR.open}">${open} açık</b> · <b style="color:${STATUS_COLOR.warn}">${warn} uyarı</b> · <b style="color:${STATUS_COLOR.ok}">${ok} tamam</b></p>
<p style="font-size:13px;color:#424a53">Parantez içindeki kodlar 6 Kasım 2026 denetim raporundaki bulgu numaralarıdır. Otomatik kontrol yalnızca makineyle doğrulanabilen maddeleri kapsar; mantık açıkları (IDOR, OTP limiti vb.) kod değişikliğiyle kapatıldıkça elle teyit edilmelidir.</p>
${tables}
${depList}
${fullSection}
</body></html>`;
}

function buildText() {
  return results.map((r) => `[${STATUS_LABEL[r.status]}] ${r.group} / ${r.name}${r.findingId ? ` (${r.findingId})` : ""}: ${r.detail}`).join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const full = args.includes("--full");
  const dryRun = args.includes("--dry-run");
  const toIdx = args.indexOf("--to");
  const to = toIdx >= 0 && args[toIdx + 1] ? args[toIdx + 1] : DEFAULT_TO;

  const runAt = new Intl.DateTimeFormat("tr-TR", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date());

  checkServer();
  await checkHttp();
  checkCode();
  const audit = checkDependencies();

  const open = results.filter((r) => r.status === "open").length;
  const warn = results.filter((r) => r.status === "warn").length;
  const html = buildHtml(audit, full, runAt);
  const text = buildText();
  const subject = `${full ? "GÜVENLİK DENETİM RAPORU" : "HAFTALIK GÜVENLİK KONTROLÜ"} — ${open} açık, ${warn} uyarı`;

  console.log(`[security-weekly-check] ${runAt} · ${open} açık, ${warn} uyarı`);
  console.log(text);

  if (dryRun) {
    console.log(html);
    return;
  }

  const company = await getCompanySettings();
  await sendCompanyMail(company, { to, subject, text, html, bcc: "" });
  console.log(`[security-weekly-check] e-posta gönderildi: ${to}`);
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[security-weekly-check]", error);
    process.exit(1);
  });
