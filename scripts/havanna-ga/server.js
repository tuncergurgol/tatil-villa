const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const { processProductImage } = require("./product-image");

const ROOT = __dirname;

// Load local .env without extra dependency (KEY=VALUE lines).
(() => {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
})();

const PRODUCTS_FILE = path.join(ROOT, "data", "products.json");
const GROUPS_FILE = path.join(ROOT, "data", "groups.json");
const SETTINGS_FILE = path.join(ROOT, "data", "settings.json");
const USERS_FILE = path.join(ROOT, "data", "users.json");
const RESET_FILE = path.join(ROOT, "data", "password-resets.json");
const INQUIRIES_FILE = path.join(ROOT, "data", "inquiries.json");
const UPLOAD_DIR = path.join(ROOT, "images", "uploads");
const PORT = Number(process.env.PORT || 5177);
const SESSION_SECRET =
  process.env.HAVANNA_SESSION_SECRET || "havanna-dev-session-change-me";
const ADMIN_PASSWORD = process.env.HAVANNA_ADMIN_PASSWORD || "HavannaAdmin2026";
const COOKIE_NAME = "havanna_admin";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;
const RESET_TTL_MS = 1000 * 60 * 60;
const EXPOSE_RESET_LINK =
  process.env.HAVANNA_EXPOSE_RESET_LINK === "1" ||
  process.env.NODE_ENV !== "production";

const DEFAULT_GROUPS = [
  {
    id: "liqueur",
    name: { tr: "Likör", en: "Liqueur", ar: "ليكور" },
    sort: 1,
    active: true,
  },
  {
    id: "spirits",
    name: { tr: "Distile", en: "Spirits", ar: "مشروبات مقطرة" },
    sort: 2,
    active: true,
  },
  {
    id: "wine",
    name: { tr: "Şarap", en: "Wine", ar: "نبيذ" },
    sort: 3,
    active: true,
  },
];

const DEFAULT_SETTINGS = {
  email: "info@havannaglobal.com",
  kep: "havannaglobal@hs01.kep.tr",
  web: "https://www.havannaglobal.com",
  phone: "",
  hq: "Mimarsinan Mah. E5 Londra Asfaltı Cad. No: 66 İç Kapı No: 6 Büyükçekmece / İstanbul",
  warehouse:
    "Yenigöl Mah. Yenigöl Cad. Konut Sitesi No: 80 İç Kapı No: 1 Muratpaşa / Antalya",
  taxOffice: "Büyükçekmece Vergi Dairesi",
  taxNumber: "4601051648",
  mersis: "0460105164800001",
  heroLeadTr: "",
  footerTagTr: "Alkollü içecek ithalatı",
  googleSiteVerification: "",
  bingSiteVerification: "",
  googleAnalyticsId: "",
  updatedAt: null,
};

const SITE_ORIGIN = (
  process.env.PUBLIC_SITE_ORIGIN ||
  "https://havannaglobal.com"
).replace(/\/+$/, "");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(path.dirname(PRODUCTS_FILE), { recursive: true });
ensureJsonFile(PRODUCTS_FILE, []);
ensureJsonFile(GROUPS_FILE, DEFAULT_GROUPS);
ensureJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
ensureJsonFile(USERS_FILE, []);
ensureJsonFile(RESET_FILE, []);
ensureJsonFile(INQUIRIES_FILE, []);

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser(SESSION_SECRET));

// Dil kapısı: /en ve /ar aynı sayfayı sunar; Türkçe öneksiz kalır.
// Göreli varlıklar (/en/styles.css) kökteki dosyaya düşer.
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  const q = req.url.indexOf("?");
  const pathOnly = q === -1 ? req.url : req.url.slice(0, q);
  const search = q === -1 ? "" : req.url.slice(q);
  const page = pathOnly.match(/^\/(en|ar)(\/urun(?:\/[^/]+)?)?\/?$/i);
  if (page) {
    req.url = (page[2] || "/") + search;
    return next();
  }
  const asset = pathOnly.match(/^\/(?:en|ar)\/(.+\.[a-z0-9]{2,5})$/i);
  if (asset) req.url = `/${asset[1]}${search}`;
  next();
});

function isPublicHttps(req) {
  const host = String(req.headers.host || "");
  return !/^(localhost|127\.0\.0\.1)(:|$)/i.test(host);
}

app.use((req, res, next) => {
  const lower = String(req.path || "").toLowerCase();
  if (
    lower.includes("..") ||
    lower.startsWith("/data/") ||
    lower === "/server.js" ||
    lower === "/package.json" ||
    lower === "/package-lock.json" ||
    lower.endsWith(".env") ||
    lower.endsWith(".sh") ||
    lower.endsWith(".py")
  ) {
    res.status(404).end();
    return;
  }

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com",
    "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://cloudflareinsights.com",
  ];
  if (isPublicHttps(req)) {
    csp.push("upgrade-insecure-requests");
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  res.setHeader("Content-Security-Policy", csp.join("; "));

  if (lower.startsWith("/images/")) {
    const ref = req.get("referer");
    if (ref) {
      let host = "";
      try {
        host = new URL(ref).hostname.toLowerCase();
      } catch {
        host = "";
      }
      const allowed =
        host === "havannaglobal.com" ||
        host.endsWith(".havannaglobal.com") ||
        host === "localhost" ||
        host === "127.0.0.1";
      if (host && !allowed) {
        res.status(403).end();
        return;
      }
    }
  }
  next();
});

const allowedMime = new Set(["image/jpeg", "image/png", "image/webp"]);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext =
      file.mimetype === "image/png"
        ? ".png"
        : file.mimetype === "image/webp"
          ? ".webp"
          : ".jpg";
    // Geçici ad; processProductImage sonrası ürün adına göre webp'ye çevrilir.
    cb(null, `tmp-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMime.has(file.mimetype)) {
      cb(new Error("Yalnızca JPG, PNG veya WEBP yükleyebilirsiniz."));
      return;
    }
    cb(null, true);
  },
});

async function finalizeUploadedImages(files, productName) {
  const out = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const abs = file.path || path.join(UPLOAD_DIR, file.filename);
    try {
      const processed = await processProductImage({
        inputPath: abs,
        outputDir: UPLOAD_DIR,
        productName,
        seq: `${Date.now().toString(36)}${i}${crypto.randomBytes(2).toString("hex")}`,
      });
      out.push(processed.relativePath);
    } finally {
      try {
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      } catch (_) {}
    }
  }
  return out;
}

function ensureJsonFile(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2), "utf8");
  }
}

function readJson(file, fallback) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function readProducts() {
  const data = readJson(PRODUCTS_FILE, []);
  return Array.isArray(data) ? data : [];
}

function writeProducts(list) {
  writeJson(PRODUCTS_FILE, list);
}

function normalizeLocalizedName(raw, fallback = "") {
  if (raw && typeof raw === "object") {
    const tr = String(raw.tr || "").trim() || fallback;
    return {
      tr,
      en: String(raw.en || "").trim() || tr,
      ar: String(raw.ar || "").trim() || tr,
    };
  }
  const tr = String(raw || fallback).trim() || fallback;
  return { tr, en: tr, ar: tr };
}

function normalizeSubGroup(raw, index = 0) {
  const name = normalizeLocalizedName(
    raw?.name ?? raw?.nameTr ?? raw,
    `alt-${index + 1}`
  );
  const id = slugify(raw?.id || name.tr || `alt-${index + 1}`);
  return {
    id,
    name,
    sort: Number.isFinite(Number(raw?.sort)) ? Number(raw.sort) : index + 1,
    active: raw?.active !== false,
  };
}

function normalizeGroup(raw, index = 0) {
  const id = slugify(raw?.id || raw?.name?.tr || raw?.name || `grup-${index + 1}`);
  const name = normalizeLocalizedName(raw?.name ?? raw?.nameTr ?? raw?.name, id);
  const subGroups = Array.isArray(raw?.subGroups)
    ? raw.subGroups
        .map((item, i) => normalizeSubGroup(item, i))
        .filter((item) => item.id && item.name.tr)
        .sort(
          (a, b) => a.sort - b.sort || a.name.tr.localeCompare(b.name.tr, "tr")
        )
    : [];
  // Ensure unique subgroup ids within a group
  const seen = new Set();
  const uniqueSubGroups = [];
  for (const sg of subGroups) {
    let nextId = sg.id;
    let n = 2;
    while (seen.has(nextId)) {
      nextId = `${sg.id}-${n}`;
      n += 1;
    }
    seen.add(nextId);
    uniqueSubGroups.push({ ...sg, id: nextId });
  }
  return {
    id,
    name,
    sort: Number.isFinite(Number(raw?.sort)) ? Number(raw.sort) : index + 1,
    active: raw?.active !== false,
    subGroups: uniqueSubGroups,
  };
}

function readGroups() {
  const data = readJson(GROUPS_FILE, DEFAULT_GROUPS);
  const list = Array.isArray(data) ? data.map(normalizeGroup) : DEFAULT_GROUPS;
  return list.sort((a, b) => a.sort - b.sort || a.name.tr.localeCompare(b.name.tr, "tr"));
}

function groupLabelTr(groups, categoryId) {
  const group = groups.find((g) => g.id === categoryId);
  return group?.name?.tr || categoryId || "";
}

/** Ürünler: grup → alt grup → ad (TR alfabetik). */
function sortProductsAlpha(products, groups = readGroups()) {
  return [...products].sort((a, b) => {
    const byGroup = groupLabelTr(groups, a.category).localeCompare(
      groupLabelTr(groups, b.category),
      "tr",
      { sensitivity: "base" }
    );
    if (byGroup) return byGroup;
    const bySub = String(a.subGroup || "").localeCompare(String(b.subGroup || ""), "tr", {
      sensitivity: "base",
    });
    if (bySub) return bySub;
    return String(a.name || "").localeCompare(String(b.name || ""), "tr", {
      sensitivity: "base",
      numeric: true,
    });
  });
}

function writeGroups(list) {
  writeJson(GROUPS_FILE, list.map((item, index) => normalizeGroup(item, index)));
}

function readSettings() {
  return { ...DEFAULT_SETTINGS, ...readJson(SETTINGS_FILE, DEFAULT_SETTINGS) };
}

function writeSettings(settings) {
  writeJson(SETTINGS_FILE, settings);
}

function readInquiries() {
  const data = readJson(INQUIRIES_FILE, []);
  return Array.isArray(data) ? data : [];
}

function writeInquiries(list) {
  writeJson(INQUIRIES_FILE, list);
}

function clipText(value, max) {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, max);
}

function isContactEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const contactAttempts = new Map();
function rateLimitContact(ip) {
  const now = Date.now();
  pruneLimits(contactAttempts, 15 * 60 * 1000);
  const row = contactAttempts.get(ip) || { count: 0, start: now };
  if (now - row.start > 15 * 60 * 1000) {
    row.count = 0;
    row.start = now;
  }
  row.count += 1;
  contactAttempts.set(ip, row);
  return row.count <= 8;
}

function clientIp(req) {
  const real = String(req.headers["x-real-ip"] || "")
    .split(",")[0]
    .trim();
  if (real) return real;
  return req.ip || req.socket.remoteAddress || "unknown";
}

function pruneLimits(map, windowMs) {
  if (map.size < 4000) return;
  const now = Date.now();
  for (const [key, row] of map) {
    if (!row || now - row.start > windowMs) map.delete(key);
  }
}

const CONTACT_INBOX = "info@havannaglobal.com.tr";

function loadNodemailer() {
  try {
    return require("nodemailer");
  } catch {
    return null;
  }
}

function oneLine(value) {
  return String(value || "")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

async function sendContactEmail(entry) {
  const nodemailer = loadNodemailer();
  if (!nodemailer) {
    throw new Error("Nodemailer yüklü değil.");
  }
  const host = String(process.env.HAVANNA_SMTP_HOST || "").trim();
  const user = String(process.env.HAVANNA_SMTP_USER || "").trim();
  const pass = String(process.env.HAVANNA_SMTP_PASS || "");
  if (!host || !user || !pass) {
    throw new Error("SMTP ayarı eksik.");
  }
  const port = Number(process.env.HAVANNA_SMTP_PORT || 587);
  const secureMode = String(process.env.HAVANNA_SMTP_SECURE || "starttls").toLowerCase();
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: secureMode === "ssl",
    auth: { user, pass },
    ...(secureMode === "starttls"
      ? { requireTLS: true, tls: { minVersion: "TLSv1.2" } }
      : {}),
  });
  const fromEmail = String(process.env.HAVANNA_SMTP_FROM || user).trim();
  const fromName = String(process.env.HAVANNA_SMTP_FROM_NAME || "Havanna Global").trim();
  const lines = [
    `Ad soyad: ${entry.name}`,
    entry.company ? `Firma: ${entry.company}` : null,
    `E-posta: ${entry.email}`,
    entry.phone ? `Telefon: ${entry.phone}` : null,
    "",
    entry.message,
  ].filter((line) => line !== null);
  await transport.sendMail({
    from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
    to: CONTACT_INBOX,
    replyTo: entry.email,
    subject: `Havanna Global iletişim formu — ${oneLine(entry.name)}`,
    text: lines.join("\n"),
  });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  const got = crypto.scryptSync(String(password), salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(got, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || "admin",
    active: user.active !== false,
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function bootstrapUsersIfEmpty(list) {
  if (Array.isArray(list) && list.length > 0) return list;
  const settings = readSettings();
  const seed = {
    id: "admin",
    name: "Yönetici",
    email: normalizeEmail(settings.email || "info@havannaglobal.com"),
    passwordHash: hashPassword(ADMIN_PASSWORD),
    role: "admin",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeJson(USERS_FILE, [seed]);
  return [seed];
}

function readUsers() {
  const data = readJson(USERS_FILE, []);
  const list = Array.isArray(data) ? data : [];
  return bootstrapUsersIfEmpty(list);
}

function writeUsers(list) {
  writeJson(USERS_FILE, list);
}

function findUserByEmail(email) {
  const needle = normalizeEmail(email);
  return readUsers().find((u) => normalizeEmail(u.email) === needle) || null;
}

function readResets() {
  const data = readJson(RESET_FILE, []);
  const list = Array.isArray(data) ? data : [];
  const now = Date.now();
  return list.filter((r) => r && r.exp > now && r.token);
}

function writeResets(list) {
  writeJson(RESET_FILE, list);
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(body)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const token = req.signedCookies?.[COOKIE_NAME] || req.cookies?.[COOKIE_NAME];
  const session = verifyToken(token);
  if (!session) {
    res.status(401).json({ error: "Oturum gerekli." });
    return;
  }
  req.admin = session;
  next();
}

const loginAttempts = new Map();
function rateLimitLogin(ip) {
  const now = Date.now();
  pruneLimits(loginAttempts, 15 * 60 * 1000);
  const row = loginAttempts.get(ip) || { count: 0, start: now };
  if (now - row.start > 15 * 60 * 1000) {
    row.count = 0;
    row.start = now;
  }
  row.count += 1;
  loginAttempts.set(ip, row);
  return row.count <= 12;
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function findGroup(id) {
  return readGroups().find((g) => g.id === id) || null;
}

function unlinkUpload(imagePath) {
  if (!imagePath || !String(imagePath).startsWith("images/uploads/")) return;
  const abs = path.join(ROOT, imagePath);
  if (abs.startsWith(UPLOAD_DIR) && fs.existsSync(abs)) {
    try {
      fs.unlinkSync(abs);
    } catch (_) {}
  }
}

function parseUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload.single("image")(req, res, (err) => {
      if (err) reject(err);
      else resolve(req.file || null);
    });
  });
}

function parseMultiUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload.array("images", 12)(req, res, (err) => {
      if (err) reject(err);
      else resolve(Array.isArray(req.files) ? req.files : []);
    });
  });
}

function productImagesOf(product) {
  if (Array.isArray(product?.images) && product.images.length) {
    return product.images.map((x) => String(x)).filter(Boolean);
  }
  if (product?.image) return [String(product.image)];
  return [];
}

function parseActiveFlag(raw, fallback = true) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  return !(raw === false || raw === "false" || raw === "0" || raw === 0);
}

function parseKeepImages(raw) {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
}

function parseImageOrder(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((item) => {
        if (item?.t === "k" && item.p) return { t: "k", p: String(item.p) };
        if (item?.t === "n") return { t: "n" };
        return null;
      })
      .filter(Boolean);
  } catch {
    return null;
  }
}

function orderedProductImages(order, kept, uploaded) {
  if (!order) return [...kept, ...uploaded];
  let uploadCursor = 0;
  const images = [];
  for (const entry of order) {
    if (entry.t === "k") {
      if (kept.includes(entry.p)) images.push(entry.p);
      continue;
    }
    const next = uploaded[uploadCursor];
    uploadCursor += 1;
    if (next) images.push(next);
  }
  if (uploadCursor < uploaded.length) images.push(...uploaded.slice(uploadCursor));
  return images;
}

function parseSeoFromBody(body = {}, fallback = {}) {
  return {
    title: String(body.seoTitle ?? fallback.title ?? "").trim(),
    description: String(body.seoDescription ?? fallback.description ?? "").trim(),
    keywords: String(body.seoKeywords ?? fallback.keywords ?? "").trim(),
    slug: String(body.seoSlug ?? fallback.slug ?? "").trim(),
  };
}

function buildProductSeo({ name, meta, description, categoryName }) {
  const cleanName = String(name || "").trim() || "Ürün";
  const short =
    String(description || "").trim() ||
    String(meta || "").trim() ||
    `${cleanName} ürünü Havanna Global portföyünde.`;
  const title = `${cleanName} | Havanna Global`.slice(0, 70);
  const seoDescription = short.replace(/\s+/g, " ").slice(0, 160);
  const keywords = [
    cleanName,
    categoryName,
    "Havanna Global",
    "premium içecek",
    "ithalat",
    meta,
  ]
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(", ");
  return {
    title,
    description: seoDescription,
    keywords,
    slug: slugify(cleanName) || `urun-${Date.now()}`,
  };
}

async function generateProductSeoWithAi(payload) {
  const apiKey = (
    process.env.HAVANNA_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ""
  ).trim();
  const fallback = buildProductSeo(payload);
  if (!apiKey) return { seo: fallback, source: "template" };

  const prompt = `Sen bir SEO uzmanısın. Aşağıdaki ürün için Türkçe SEO alanları üret.
Kurallar:
- title max 70 karakter
- description max 160 karakter
- keywords virgülle ayrılmış 6-12 ifade
- slug yalnızca küçük harf, rakam ve tire
Sadece JSON döndür: {"title":"","description":"","keywords":"","slug":""}

Ürün adı: ${payload.name}
Grup: ${payload.categoryName || "-"}
Kısa: ${payload.meta || "-"}
Uzun: ${payload.description || "-"}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.HAVANNA_OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "SEO içerik üreticisisin. Yalnızca JSON cevap ver." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return { seo: fallback, source: "template" };
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(text);
    return {
      seo: {
        title: String(parsed.title || fallback.title).trim().slice(0, 70),
        description: String(parsed.description || fallback.description)
          .trim()
          .slice(0, 160),
        keywords: String(parsed.keywords || fallback.keywords).trim(),
        slug: slugify(parsed.slug || fallback.slug) || fallback.slug,
      },
      source: "openai",
    };
  } catch {
    return { seo: fallback, source: "template" };
  }
}

app.get("/api/products", (_req, res) => {
  res.set("Cache-Control", "no-store");
  const groups = readGroups();
  const products = sortProductsAlpha(
    readProducts().filter((p) => p.active !== false),
    groups
  );
  const activeGroups = groups
    .filter((g) => g.active)
    .sort((a, b) => a.name.tr.localeCompare(b.name.tr, "tr", { sensitivity: "base" }))
    .map((g) => ({
      ...g,
      subGroups: [...(g.subGroups || [])].sort((a, b) =>
        a.name.tr.localeCompare(b.name.tr, "tr", { sensitivity: "base" })
      ),
    }));
  res.json({ products, groups: activeGroups });
});

app.get("/api/products/:id", (req, res) => {
  res.set("Cache-Control", "no-store");
  const id = String(req.params.id || "").trim();
  const groups = readGroups();
  const products = sortProductsAlpha(
    readProducts().filter((p) => p.active !== false),
    groups
  );
  const product =
    products.find((p) => p.id === id) ||
    products.find((p) => p.seo?.slug === id) ||
    null;
  if (!product) {
    res.status(404).json({ error: "Ürün bulunamadı." });
    return;
  }
  const related = sortProductsAlpha(
    products
      .filter(
        (p) =>
          p.id !== product.id &&
          (p.category === product.category ||
            String(p.id).startsWith("moju-") ===
              String(product.id).startsWith("moju-"))
      )
      .filter((p) =>
        String(product.id).startsWith("moju-")
          ? String(p.id).startsWith("moju-")
          : p.category === product.category
      ),
    groups
  ).slice(0, 8);
  res.json({
    product,
    related,
    groups: groups.filter((g) => g.active),
  });
});

app.get("/urun/:id", (req, res) => {
  res.sendFile(path.join(ROOT, "urun.html"));
});

app.get("/urun", (_req, res) => {
  res.sendFile(path.join(ROOT, "urun.html"));
});

function localizedLocs(path) {
  const bare = path === "/" ? "/" : path;
  return [
    { lang: "tr", loc: `${SITE_ORIGIN}${bare}` },
    { lang: "en", loc: `${SITE_ORIGIN}/en${bare === "/" ? "/" : bare}` },
    { lang: "ar", loc: `${SITE_ORIGIN}/ar${bare === "/" ? "/" : bare}` },
  ];
}

app.get("/sitemap.xml", (_req, res) => {
  const products = readProducts().filter((p) => p.active !== false);
  const today = new Date().toISOString().slice(0, 10);
  const pages = [
    { path: "/", priority: "1.0", changefreq: "weekly" },
    ...products.map((p) => ({
      path: `/urun/${encodeURIComponent(p.seo?.slug || p.id)}`,
      priority: "0.8",
      changefreq: "weekly",
    })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages
  .map((page) => {
    const locs = localizedLocs(page.path);
    const alternates = [
      ...locs.map(
        (item) =>
          `    <xhtml:link rel="alternate" hreflang="${item.lang}" href="${item.loc}"/>`
      ),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${locs[0].loc}"/>`,
    ].join("\n");
    return locs
      .map(
        (item) => `  <url>
    <loc>${item.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
${alternates}
  </url>`
      )
      .join("\n");
  })
  .join("\n")}
</urlset>
`;
  res.type("application/xml").send(body);
});

app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").sendFile(path.join(ROOT, "robots.txt"));
});

app.get("/llms.txt", (_req, res) => {
  res.type("text/plain").sendFile(path.join(ROOT, "llms.txt"));
});

app.get("/api/groups", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ groups: readGroups().filter((g) => g.active) });
});

app.get("/api/settings", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ settings: readSettings() });
});

app.get("/api/admin/session", (req, res) => {
  const token = req.signedCookies?.[COOKIE_NAME] || req.cookies?.[COOKIE_NAME];
  const session = verifyToken(token);
  if (!session) {
    res.json({ ok: false });
    return;
  }
  res.json({
    ok: true,
    user: {
      id: session.uid || null,
      email: session.email || null,
      name: session.name || null,
      role: session.role || "admin",
    },
  });
});

function adminCookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: "lax",
    signed: true,
    secure: isPublicHttps(req),
    path: "/",
  };
}

app.post("/api/admin/login", (req, res) => {
  const ip = clientIp(req);
  if (!rateLimitLogin(ip)) {
    res.status(429).json({ error: "Çok fazla deneme. Bir süre sonra tekrar deneyin." });
    return;
  }
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  if (!email || !password) {
    res.status(400).json({ error: "E-posta ve şifre gerekli." });
    return;
  }
  const user = findUserByEmail(email);
  const ok =
    user &&
    user.active !== false &&
    verifyPassword(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "E-posta veya şifre hatalı." });
    return;
  }
  const token = signToken({
    role: user.role || "admin",
    uid: user.id,
    email: user.email,
    name: user.name,
    exp: Date.now() + TOKEN_TTL_MS,
  });
  res.cookie(COOKIE_NAME, token, {
    ...adminCookieOptions(req),
    maxAge: TOKEN_TTL_MS,
  });
  res.json({ ok: true, user: publicUser(user) });
});

app.post("/api/admin/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, adminCookieOptions(req));
  res.json({ ok: true });
});

app.post("/api/admin/forgot-password", (req, res) => {
  const ip = clientIp(req);
  if (!rateLimitLogin(ip)) {
    res.status(429).json({ error: "Çok fazla deneme. Bir süre sonra tekrar deneyin." });
    return;
  }
  const email = normalizeEmail(req.body?.email);
  if (!email) {
    res.status(400).json({ error: "E-posta gerekli." });
    return;
  }
  const user = findUserByEmail(email);
  const generic = {
    ok: true,
    message:
      "Eşleşen aktif hesap varsa şifre sıfırlama bağlantısı oluşturuldu.",
  };
  if (!user || user.active === false) {
    res.json(generic);
    return;
  }
  const token = crypto.randomBytes(24).toString("hex");
  const resets = readResets().filter((r) => r.userId !== user.id);
  resets.push({
    token,
    userId: user.id,
    email: user.email,
    exp: Date.now() + RESET_TTL_MS,
    createdAt: new Date().toISOString(),
  });
  writeResets(resets);
  const host = req.get("x-forwarded-host") || req.get("host") || `127.0.0.1:${PORT}`;
  const proto = req.get("x-forwarded-proto") || req.protocol || "http";
  const resetUrl = `${proto}://${host}/admin/reset.html?token=${token}`;
  const outboxDir = path.join(ROOT, "data", "outbox");
  fs.mkdirSync(outboxDir, { recursive: true });
  fs.writeFileSync(
    path.join(outboxDir, `reset-${Date.now()}.json`),
    JSON.stringify(
      {
        to: user.email,
        subject: "Havanna Global — şifre sıfırlama",
        resetUrl,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );
  if (EXPOSE_RESET_LINK) {
    res.json({ ...generic, resetUrl });
    return;
  }
  res.json(generic);
});

app.post("/api/admin/reset-password", (req, res) => {
  if (!rateLimitLogin(clientIp(req))) {
    res.status(429).json({ error: "Çok fazla deneme. Bir süre sonra tekrar deneyin." });
    return;
  }
  const token = String(req.body?.token || "").trim();
  const password = String(req.body?.password || "");
  if (!token || password.length < 8) {
    res
      .status(400)
      .json({ error: "Geçerli jeton ve en az 8 karakter şifre gerekli." });
    return;
  }
  const resets = readResets();
  const row = resets.find((r) => r.token === token);
  if (!row) {
    res
      .status(400)
      .json({ error: "Sıfırlama bağlantısı geçersiz veya süresi dolmuş." });
    return;
  }
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === row.userId);
  if (idx < 0) {
    res.status(400).json({ error: "Kullanıcı bulunamadı." });
    return;
  }
  users[idx] = {
    ...users[idx],
    passwordHash: hashPassword(password),
    updatedAt: new Date().toISOString(),
  };
  writeUsers(users);
  writeResets(resets.filter((r) => r.token !== token && r.userId !== row.userId));
  res.json({ ok: true });
});

app.get("/api/admin/users", requireAdmin, (_req, res) => {
  res.json({ users: readUsers().map(publicUser) });
});

app.post("/api/admin/users", requireAdmin, (req, res) => {
  const body = req.body || {};
  const email = normalizeEmail(body.email);
  const name = String(body.name || "").trim();
  const password = String(body.password || "");
  const role = body.role === "editor" ? "editor" : "admin";
  if (!email || !name) {
    res.status(400).json({ error: "Ad ve e-posta gerekli." });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Şifre en az 8 karakter olmalı." });
    return;
  }
  if (findUserByEmail(email)) {
    res.status(400).json({ error: "Bu e-posta zaten kayıtlı." });
    return;
  }
  const users = readUsers();
  const user = {
    id:
      slugify(email.split("@")[0] || "user") +
      "-" +
      crypto.randomBytes(3).toString("hex"),
    name,
    email,
    passwordHash: hashPassword(password),
    role,
    active: body.active !== false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);
  res.json({ user: publicUser(user) });
});

app.put("/api/admin/users/:id", requireAdmin, (req, res) => {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx < 0) {
    res.status(404).json({ error: "Kullanıcı bulunamadı." });
    return;
  }
  const body = req.body || {};
  const email = normalizeEmail(body.email ?? users[idx].email);
  const name = String(body.name ?? users[idx].name).trim();
  if (!email || !name) {
    res.status(400).json({ error: "Ad ve e-posta gerekli." });
    return;
  }
  const clash = users.find(
    (u, i) => i !== idx && normalizeEmail(u.email) === email
  );
  if (clash) {
    res.status(400).json({ error: "Bu e-posta zaten kayıtlı." });
    return;
  }
  const next = {
    ...users[idx],
    name,
    email,
    role: body.role === "editor" ? "editor" : "admin",
    active: body.active !== false,
    updatedAt: new Date().toISOString(),
  };
  if (body.password) {
    if (String(body.password).length < 8) {
      res.status(400).json({ error: "Şifre en az 8 karakter olmalı." });
      return;
    }
    next.passwordHash = hashPassword(body.password);
  }
  users[idx] = next;
  writeUsers(users);
  res.json({ user: publicUser(next) });
});

app.delete("/api/admin/users/:id", requireAdmin, (req, res) => {
  const users = readUsers();
  const target = users.find((u) => u.id === req.params.id);
  if (!target) {
    res.status(404).json({ error: "Kullanıcı bulunamadı." });
    return;
  }
  const remainingAdmins = users.filter(
    (u) => u.id !== target.id && u.role !== "editor" && u.active !== false
  );
  if (remainingAdmins.length === 0 && (target.role || "admin") !== "editor") {
    res.status(400).json({ error: "Son yönetici silinemez." });
    return;
  }
  writeUsers(users.filter((u) => u.id !== target.id));
  res.json({ ok: true, id: target.id });
});

app.get("/api/admin/products", requireAdmin, (_req, res) => {
  res.json({ products: readProducts(), groups: readGroups() });
});

app.post("/api/admin/products/seo-ai", requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) {
      res.status(400).json({ error: "Ürün adı gerekli." });
      return;
    }
    const category = String(req.body?.category || "").trim();
    const group = category ? findGroup(category) : null;
    const result = await generateProductSeoWithAi({
      name,
      meta: String(req.body?.meta || "").trim(),
      description: String(req.body?.description || "").trim(),
      categoryName: group?.name?.tr || category,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "SEO üretilemedi." });
  }
});

app.post("/api/admin/products", requireAdmin, async (req, res) => {
  try {
    const files = await parseMultiUpload(req, res);
    const name = String(req.body?.name || "").trim();
    const category = String(req.body?.category || "").trim();
    const meta = String(req.body?.meta || "").trim();
    const description = String(req.body?.description || "").trim();
    const subGroup = String(req.body?.subGroup || "").trim();
    if (!name) {
      res.status(400).json({ error: "Ürün adı gerekli." });
      return;
    }
    const group = findGroup(category);
    if (!group) {
      res.status(400).json({ error: "Geçersiz ürün grubu." });
      return;
    }
    if (!files.length) {
      res.status(400).json({ error: "En az bir ürün görseli gerekli." });
      return;
    }

    const list = readProducts();
    let id = slugify(name) || `urun-${Date.now()}`;
    if (list.some((p) => p.id === id)) id = `${id}-${Date.now()}`;

    const images = await finalizeUploadedImages(files, name);
    const seo = parseSeoFromBody(req.body);
    if (!seo.title || !seo.description) {
      const generated = buildProductSeo({
        name,
        meta,
        description,
        categoryName: group.name?.tr || group.id,
      });
      seo.title = seo.title || generated.title;
      seo.description = seo.description || generated.description;
      seo.keywords = seo.keywords || generated.keywords;
      seo.slug = seo.slug || generated.slug;
    }

    const product = {
      id,
      name,
      category: group.id,
      subGroup,
      labelKey: `cat.${group.id}`,
      meta,
      description,
      image: images[0],
      images,
      seo,
      active: parseActiveFlag(req.body?.active, true),
      createdAt: new Date().toISOString(),
    };
    list.unshift(product);
    writeProducts(list);
    res.status(201).json({ product });
  } catch (err) {
    res.status(400).json({ error: err.message || "Yükleme hatası." });
  }
});

app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    const list = readProducts();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "Ürün bulunamadı." });
      return;
    }

    const files = await parseMultiUpload(req, res);
    const current = list[idx];
    const name = String(req.body?.name || current.name).trim();
    const category = String(req.body?.category || current.category).trim();
    const meta =
      req.body?.meta !== undefined
        ? String(req.body.meta || "").trim()
        : String(current.meta || "").trim();
    const description =
      req.body?.description !== undefined
        ? String(req.body.description || "").trim()
        : String(current.description || "").trim();
    const subGroup =
      req.body?.subGroup !== undefined
        ? String(req.body.subGroup || "").trim()
        : String(current.subGroup || "").trim();

    if (!name) {
      res.status(400).json({ error: "Ürün adı gerekli." });
      return;
    }
    const group = findGroup(category);
    if (!group) {
      res.status(400).json({ error: "Geçersiz ürün grubu." });
      return;
    }

    const previousImages = productImagesOf(current);
    const keepImages =
      req.body?.keepImages !== undefined
        ? parseKeepImages(req.body.keepImages)
        : previousImages;
    const kept = keepImages.filter((path) => previousImages.includes(path));
    const uploaded = files.length
      ? await finalizeUploadedImages(files, name)
      : [];
    const images = orderedProductImages(
      parseImageOrder(req.body?.imageOrder),
      kept,
      uploaded
    );
    if (!images.length) {
      res.status(400).json({ error: "En az bir ürün görseli gerekli." });
      return;
    }

    previousImages.forEach((path) => {
      if (!kept.includes(path)) unlinkUpload(path);
    });

    const seo = parseSeoFromBody(req.body, current.seo || {});

    const next = {
      ...current,
      name,
      category: group.id,
      subGroup,
      labelKey: current.labelKey || `cat.${group.id}`,
      meta,
      description,
      image: images[0],
      images,
      seo,
      updatedAt: new Date().toISOString(),
    };

    if (req.body?.active !== undefined) {
      next.active = parseActiveFlag(req.body.active, true);
    }

    list[idx] = next;
    writeProducts(list);
    res.json({ product: next });
  } catch (err) {
    res.status(400).json({ error: err.message || "Güncelleme hatası." });
  }
});

app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
  const id = String(req.params.id || "");
  const list = readProducts();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Ürün bulunamadı." });
    return;
  }
  const [removed] = list.splice(idx, 1);
  writeProducts(list);
  productImagesOf(removed).forEach((path) => unlinkUpload(path));
  res.json({ ok: true, id });
});

app.get("/api/admin/groups", requireAdmin, (_req, res) => {
  res.json({ groups: readGroups() });
});

app.post("/api/admin/groups", requireAdmin, (req, res) => {
  const groups = readGroups();
  const incoming = normalizeGroup(req.body, groups.length);
  if (!incoming.id || !incoming.name.tr) {
    res.status(400).json({ error: "Grup adı gerekli." });
    return;
  }
  if (groups.some((g) => g.id === incoming.id)) {
    res.status(400).json({ error: "Bu grup kimliği zaten var." });
    return;
  }
  groups.push(incoming);
  writeGroups(groups);
  res.status(201).json({ group: incoming });
});

function subgroupKeys(sg) {
  return [sg?.id, sg?.name?.tr, sg?.name?.en, sg?.name?.ar]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
}

function productUsesSubgroup(product, sg) {
  const raw = String(product?.subGroup || "").trim().toLowerCase();
  if (!raw) return false;
  return subgroupKeys(sg).includes(raw);
}

function subgroupTitle(sg) {
  return String(sg?.name?.tr || sg?.id || "").trim();
}

app.put("/api/admin/groups/:id", requireAdmin, (req, res) => {
  const id = String(req.params.id || "");
  const groups = readGroups();
  const idx = groups.findIndex((g) => g.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Grup bulunamadı." });
    return;
  }

  const nextId = slugify(req.body?.id || id) || id;
  if (nextId !== id && groups.some((g) => g.id === nextId)) {
    res.status(400).json({ error: "Bu grup kimliği zaten var." });
    return;
  }

  const updated = normalizeGroup(
    {
      ...groups[idx],
      ...req.body,
      id: nextId,
      name: {
        tr: req.body?.name?.tr ?? groups[idx].name.tr,
        en: req.body?.name?.en ?? groups[idx].name.en,
        ar: req.body?.name?.ar ?? groups[idx].name.ar,
      },
      subGroups:
        req.body?.subGroups !== undefined
          ? req.body.subGroups
          : groups[idx].subGroups,
    },
    idx
  );

  const removedSubs = (groups[idx].subGroups || []).filter(
    (old) =>
      !(updated.subGroups || []).some((sg) => {
        const oldKeys = new Set(subgroupKeys(old));
        return subgroupKeys(sg).some((key) => oldKeys.has(key));
      })
  );
  const removedProducts = readProducts().filter(
    (product) =>
      (product.category === id || product.category === nextId) &&
      removedSubs.some((sg) => productUsesSubgroup(product, sg))
  );
  if (removedProducts.length) {
    res.status(400).json({
      error: `Kaldırılmak istenen alt grup ${removedProducts.length} üründe kayıtlı. Önce bu ürünleri başka bir alt gruba taşıyın veya silin.`,
      kind: "products",
      products: removedProducts.map((product) => product.name).filter(Boolean),
    });
    return;
  }

  groups[idx] = updated;

  if (nextId !== id) {
    const products = readProducts().map((p) =>
      p.category === id
        ? { ...p, category: nextId, labelKey: `cat.${nextId}` }
        : p
    );
    writeProducts(products);
  }

  writeGroups(groups);
  res.json({ group: updated });
});

app.delete("/api/admin/groups/:id", requireAdmin, (req, res) => {
  const id = String(req.params.id || "");
  const groups = readGroups();
  const group = groups.find((g) => g.id === id);
  const subGroups = Array.isArray(group?.subGroups) ? group.subGroups : [];
  if (subGroups.length) {
    const names = subGroups.map(subgroupTitle).filter(Boolean);
    res.status(400).json({
      error: `"${group?.name?.tr || id}" üst grubu ${names.length} alt gruba bağlı. Silmek için önce bu alt grupları kaldırın.`,
      kind: "subgroups",
      subgroups: names,
    });
    return;
  }
  const usedProducts = readProducts().filter((product) => product.category === id);
  if (usedProducts.length) {
    res.status(400).json({
      error: `"${group?.name?.tr || id}" grubu ${usedProducts.length} üründe kayıtlı. Silmek için önce bu ürünleri başka bir gruba taşıyın veya silin.`,
      kind: "products",
      products: usedProducts.map((product) => product.name).filter(Boolean),
    });
    return;
  }
  const next = groups.filter((g) => g.id !== id);
  if (next.length === groups.length) {
    res.status(404).json({ error: "Grup bulunamadı." });
    return;
  }
  writeGroups(next);
  res.json({ ok: true, id });
});

app.get("/api/admin/settings", requireAdmin, (_req, res) => {
  res.json({ settings: readSettings() });
});

app.put("/api/admin/settings", requireAdmin, (req, res) => {
  const current = readSettings();
  const body = req.body || {};
  const settings = {
    ...current,
    email: String(body.email ?? current.email).trim(),
    kep: String(body.kep ?? current.kep).trim(),
    web: String(body.web ?? current.web).trim(),
    phone: String(body.phone ?? current.phone).trim(),
    hq: String(body.hq ?? current.hq).trim(),
    warehouse: String(body.warehouse ?? current.warehouse).trim(),
    taxOffice: String(body.taxOffice ?? current.taxOffice).trim(),
    taxNumber: String(body.taxNumber ?? current.taxNumber).trim(),
    mersis: String(body.mersis ?? current.mersis).trim(),
    heroLeadTr: String(body.heroLeadTr ?? current.heroLeadTr).trim(),
    footerTagTr: String(body.footerTagTr ?? current.footerTagTr).trim(),
    googleSiteVerification: String(
      body.googleSiteVerification ?? current.googleSiteVerification ?? ""
    ).trim(),
    bingSiteVerification: String(
      body.bingSiteVerification ?? current.bingSiteVerification ?? ""
    ).trim(),
    googleAnalyticsId: String(
      body.googleAnalyticsId ?? current.googleAnalyticsId ?? ""
    )
      .trim()
      .toUpperCase(),
    updatedAt: new Date().toISOString(),
  };
  writeSettings(settings);
  res.json({ settings });
});

app.post("/api/contact", async (req, res) => {
  const ip = clientIp(req);
  if (!rateLimitContact(ip)) {
    res.status(429).json({ error: "rate" });
    return;
  }

  const body = req.body || {};
  if (clipText(body.website, 200)) {
    res.json({ ok: true });
    return;
  }

  const name = clipText(body.name, 80);
  const company = clipText(body.company, 120);
  const email = clipText(body.email, 120).toLowerCase();
  const phone = clipText(body.phone, 40);
  const message = clipText(body.message, 2000);

  if (name.length < 2 || !isContactEmail(email) || message.length < 1) {
    res.status(400).json({ error: "invalid" });
    return;
  }

  const entry = {
    id: crypto.randomBytes(8).toString("hex"),
    name,
    company,
    email,
    phone,
    message,
    createdAt: new Date().toISOString(),
  };
  const list = readInquiries();
  list.unshift(entry);
  writeInquiries(list.slice(0, 500));
  try {
    await sendContactEmail(entry);
  } catch (err) {
    console.error("contact mail failed:", err && err.message ? err.message : err);
    res.status(502).json({ error: "mail" });
    return;
  }
  res.status(201).json({ ok: true });
});

app.get("/api/admin/inquiries", requireAdmin, (_req, res) => {
  res.json({ inquiries: readInquiries() });
});

app.use("/admin", express.static(path.join(ROOT, "admin"), { index: "index.html" }));
app.use(
  express.static(ROOT, {
    index: "index.html",
    setHeaders(res, filePath) {
      if (filePath.endsWith(".json")) {
        res.setHeader("Cache-Control", "no-store");
      }
      if (/\.(png|jpe?g|webp|gif|ico)$/i.test(filePath)) {
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("Cache-Control", "public, max-age=86400");
      }
      if (filePath.endsWith(".svg")) {
        res.setHeader("Content-Disposition", "attachment");
        res.setHeader("X-Content-Type-Options", "nosniff");
      }
    },
  })
);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Sunucu hatası." });
});

const HOST = process.env.HOST || "127.0.0.1";
app.listen(PORT, HOST, () => {
  console.log(`Havanna Global http://${HOST}:${PORT}`);
  console.log(`Yönetim paneli http://${HOST}:${PORT}/admin/`);
});
