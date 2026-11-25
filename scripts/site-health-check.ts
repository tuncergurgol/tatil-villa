/**
 * Her saat başı dört villa sitesini, yönetim panelini, Tatildeyiz Biz ve Havanna Global'i kontrol eder.
 * Son yanıt 200 değilse info@tatildeyiz.com.tr adresine tek bir uyarı maili gider.
 *
 * Çalıştır: npx tsx scripts/site-health-check.ts [--dry-run]
 */
import http from "node:http";
import { sendCompanyMail } from "../lib/email";
import { getCompanySettings } from "../lib/queries/company-settings";
import { getPublicSiteMeta, listPublicSiteKeys } from "../lib/public-site-keys";

const ALERT_TO = "info@tatildeyiz.com.tr";
const RETRY_WAIT_MS = 5_000;

type Target = {
  name: string;
  publicUrl: string;
  originUrl: string;
  host: string;
};

type Probe = {
  status: number | null;
  error?: string;
};

type Result = Target & {
  publicProbe: Probe;
  originProbe: Probe;
};

function targets(): Target[] {
  const seen = new Set<string>();
  const sites: Target[] = [];

  for (const key of listPublicSiteKeys()) {
    const meta = getPublicSiteMeta(key);
    const host = meta.domain.replace(/^https?:\/\//i, "").replace(/\/+$/, "").split("/")[0] ?? "";
    if (!host || seen.has(host)) continue;
    seen.add(host);
    sites.push({
      name: meta.label,
      host,
      publicUrl: `https://${host}/`,
      originUrl: "http://127.0.0.1:3000/",
    });
  }

  sites.push(
    {
      name: "Yönetim paneli",
      host: "bont.tatildeyiz.com.tr",
      publicUrl: "https://bont.tatildeyiz.com.tr/admin/login",
      originUrl: "http://127.0.0.1:3000/admin/login",
    },
    {
      name: "Tatildeyiz Biz",
      host: "www.tatildeyizbiz.com",
      publicUrl: "https://www.tatildeyizbiz.com/",
      originUrl: "http://127.0.0.1:3010/",
    },
    {
      name: "Havanna Global",
      host: "havannaglobal.com",
      publicUrl: "https://havannaglobal.com/",
      originUrl: "http://127.0.0.1:3017/",
    }
  );

  return sites;
}

async function probePublic(url: string): Promise<Probe> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: { "user-agent": "tatildeyiz-site-health/1.0" },
    });
    await response.body?.cancel();
    return { status: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "bağlantı kurulamadı";
    return { status: null, error: message };
  }
}

function probeOrigin(path: string, host: string, port: number, redirects = 0): Promise<Probe> {
  return new Promise((resolve) => {
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "GET",
        timeout: 20_000,
        headers: {
          host,
          "user-agent": "tatildeyiz-site-health/1.0",
        },
      },
      (response) => {
        response.resume();
        const status = response.statusCode ?? null;
        const location = response.headers.location;
        if (
          redirects < 3 &&
          status &&
          status >= 300 &&
          status < 400 &&
          location &&
          location.startsWith("/")
        ) {
          resolve(probeOrigin(location, host, port, redirects + 1));
          return;
        }
        resolve({ status });
      }
    );
    request.on("timeout", () => {
      request.destroy();
      resolve({ status: null, error: "zaman aşımı" });
    });
    request.on("error", (error) => {
      resolve({ status: null, error: error.message });
    });
    request.end();
  });
}

async function confirm(read: () => Promise<Probe>): Promise<Probe> {
  const first = await read();
  if (first.status === 200) return first;
  await new Promise((resolve) => setTimeout(resolve, RETRY_WAIT_MS));
  return read();
}

function describe(probeResult: Probe): string {
  if (probeResult.status === null) return probeResult.error || "yanıt yok";
  return String(probeResult.status);
}

function failed(result: Result): boolean {
  return result.publicProbe.status !== 200 || result.originProbe.status !== 200;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildMail(results: Result[], runAt: string): { subject: string; text: string; html: string } {
  const down = results.filter(failed);
  const names = down.map((item) => item.name).join(", ");
  const subject =
    down.length === 1
      ? `Site kontrolü: ${down[0]?.name} yanıt vermiyor`
      : `Site kontrolü: ${down.length} site yanıt vermiyor`;

  const text = [
    `${runAt} kontrolünde 200 dönmeyen adresler:`,
    "",
    ...down.flatMap((item) => [
      item.name,
      `  Adres: ${item.publicUrl}`,
      `  Dışarıdan: ${describe(item.publicProbe)}`,
      `  Sunucu: ${describe(item.originProbe)}`,
      "",
    ]),
    "200 dönenler:",
    ...results
      .filter((item) => !failed(item))
      .map((item) => `- ${item.name} (${item.host})`),
    "",
    names,
  ].join("\n");

  const rows = results
    .map((item) => {
      const bad = failed(item);
      return `<tr>
<td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.name)}</td>
<td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.publicUrl)}</td>
<td style="padding:8px;border-bottom:1px solid #e5e7eb;color:${item.publicProbe.status === 200 ? "#067647" : "#b42318"}">${escapeHtml(describe(item.publicProbe))}</td>
<td style="padding:8px;border-bottom:1px solid #e5e7eb;color:${item.originProbe.status === 200 ? "#067647" : "#b42318"}">${escapeHtml(describe(item.originProbe))}</td>
<td style="padding:8px;border-bottom:1px solid #e5e7eb">${bad ? "Uyarı" : "Tamam"}</td>
</tr>`;
    })
    .join("");

  const html = `<!doctype html><html><body style="font-family:Segoe UI,Arial,sans-serif;color:#1f2328">
<p>${escapeHtml(runAt)} kontrolünde aşağıdaki sitelerden biri 200 dönmedi.</p>
<table style="border-collapse:collapse;font-size:14px">
<thead><tr>
<th style="text-align:left;padding:8px">Site</th>
<th style="text-align:left;padding:8px">Adres</th>
<th style="text-align:left;padding:8px">Dışarıdan</th>
<th style="text-align:left;padding:8px">Sunucu</th>
<th style="text-align:left;padding:8px">Durum</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
</body></html>`;

  return { subject, text, html };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const runAt = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date());

  const results: Result[] = [];
  for (const target of targets()) {
    const origin = new URL(target.originUrl);
    const [publicProbe, originProbe] = await Promise.all([
      confirm(() => probePublic(target.publicUrl)),
      confirm(() =>
        probeOrigin(origin.pathname || "/", target.host, Number(origin.port || 80))
      ),
    ]);
    results.push({ ...target, publicProbe, originProbe });
  }

  const down = results.filter(failed);
  for (const item of results) {
    console.log(
      `[site-health] ${item.name} dışarıdan=${describe(item.publicProbe)} sunucu=${describe(item.originProbe)}`
    );
  }

  if (down.length === 0) {
    console.log("[site-health] tüm siteler 200. Mail gönderilmedi.");
    return;
  }

  const mail = buildMail(results, runAt);
  console.log(`[site-health] uyarı: ${down.map((item) => item.name).join(", ")}`);

  if (dryRun) {
    console.log(mail.subject);
    console.log(mail.text);
    return;
  }

  const company = await getCompanySettings();
  await sendCompanyMail(company, {
    to: ALERT_TO,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    bcc: "",
  });
  console.log(`[site-health] e-posta gönderildi: ${ALERT_TO}`);
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[site-health]", error);
    process.exit(1);
  });
