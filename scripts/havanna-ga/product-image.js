/**
 * Ürün görseli işleme: arka plan temizleme, ortalama, WebP.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const MAX_EDGE = 1200;
const WEBP_QUALITY = 82;
const CANVAS_PAD = 0.08; // %8 boşluk

function sanitizeProductFileBase(name) {
  return String(name || "urun")
    .normalize("NFKC")
    .replace(/[\/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "urun";
}

function buildProductImageFilename(productName, seq) {
  const base = sanitizeProductFileBase(productName);
  const n =
    seq != null
      ? String(seq)
      : `${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`;
  return `${base}-Havanna-${n}.webp`;
}

async function loadSharp() {
  try {
    return require("sharp");
  } catch {
    // fallback: tatil-villa sharp
    const alt = "/var/www/tatil-villa/node_modules/sharp";
    return require(alt);
  }
}

/**
 * rembg varsa kullan; yoksa sharp ile düz (beyaz/siyah) zemin temizliği.
 */
const REMBG_PY = "/var/www/havanna-global/.venv-rembg/bin/python";

let _rembgOk = null;
function rembgAvailable() {
  if (_rembgOk != null) return _rembgOk;
  if (!fs.existsSync(REMBG_PY)) {
    _rembgOk = false;
    return false;
  }
  const r = spawnSync(
    REMBG_PY,
    ["-c", "import rembg; print('ok')"],
    { encoding: "utf8", timeout: 60000 }
  );
  _rembgOk = r.status === 0 && String(r.stdout || "").includes("ok");
  return _rembgOk;
}

const REMBG_ONE = path.join(__dirname, "_rembg_one.py");

function runRembg(inputPath, outputPath) {
  if (!fs.existsSync(REMBG_PY)) throw new Error("rembg venv missing");
  const script = fs.existsSync(REMBG_ONE)
    ? REMBG_ONE
    : null;
  const args = script
    ? [script, inputPath, outputPath]
    : [
        "-c",
        `from rembg import remove,new_session\nfrom pathlib import Path\ns=new_session('u2net')\nPath(${JSON.stringify(outputPath)}).write_bytes(remove(Path(${JSON.stringify(inputPath)}).read_bytes(),session=s))\nprint('done')`,
      ];
  const r = spawnSync(REMBG_PY, args, {
    encoding: "utf8",
    timeout: 300000,
  });
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || "rembg failed");
  }
  return outputPath;
}

/** Köşe örnekleriyle düz zemin (beyaz/siyah/gri) → şeffaf. */
async function removeFlatBackground(sharp, inputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  if (ch < 4) return inputPath;

  const sample = (x, y) => {
    const i = (y * w + x) * ch;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const corners = [
    sample(2, 2),
    sample(w - 3, 2),
    sample(2, h - 3),
    sample(w - 3, h - 3),
  ];
  const avg = [0, 0, 0];
  for (const c of corners) {
    avg[0] += c[0];
    avg[1] += c[1];
    avg[2] += c[2];
  }
  avg[0] = Math.round(avg[0] / 4);
  avg[1] = Math.round(avg[1] / 4);
  avg[2] = Math.round(avg[2] / 4);

  // Düz zemin değilse (köşeler birbirinden uzak) dokunma
  let maxCornerDelta = 0;
  for (const c of corners) {
    const d =
      Math.abs(c[0] - avg[0]) + Math.abs(c[1] - avg[1]) + Math.abs(c[2] - avg[2]);
    maxCornerDelta = Math.max(maxCornerDelta, d);
  }
  if (maxCornerDelta > 90) {
    // karmaşık arka plan — ham görseli döndür, rembg yoksa en azından trim+webp
    return null;
  }

  const thr = 42;
  for (let i = 0; i < data.length; i += ch) {
    const dr = Math.abs(data[i] - avg[0]);
    const dg = Math.abs(data[i + 1] - avg[1]);
    const db = Math.abs(data[i + 2] - avg[2]);
    if (dr + dg + db <= thr * 3) {
      data[i + 3] = 0;
    }
  }

  const tmp = `${inputPath}.alpha.png`;
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(tmp);
  return tmp;
}

async function centerOnTransparentCanvas(sharp, inputPath) {
  const trimmed = sharp(inputPath).ensureAlpha().trim({ threshold: 10 });
  const meta = await trimmed.metadata();
  const w = meta.width || MAX_EDGE;
  const h = meta.height || MAX_EDGE;
  const maxSide = Math.max(w, h);
  const target = Math.min(MAX_EDGE, Math.max(640, Math.ceil(maxSide * (1 + CANVAS_PAD * 2))));
  const inner = Math.round(target * (1 - CANVAS_PAD * 2));

  const subject = await sharp(inputPath)
    .ensureAlpha()
    .trim({ threshold: 10 })
    .resize({
      width: inner,
      height: inner,
      fit: "inside",
      withoutEnlargement: true,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: target,
      height: target,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: subject, gravity: "centre" }])
    .webp({ quality: WEBP_QUALITY, alphaQuality: 80, effort: 2 });
}

/**
 * Kaynak dosyayı işle → hedef webp yolu yazar.
 * @returns {Promise<string>} absolute output path
 */
async function processProductImage({
  inputPath,
  outputDir,
  productName,
  seq,
}) {
  const sharp = await loadSharp();
  fs.mkdirSync(outputDir, { recursive: true });
  const filename = buildProductImageFilename(productName, seq);
  const outputPath = path.join(outputDir, filename);

  let working = inputPath;
  let tempAlpha = null;

  try {
    // rembg modeli Kaydet'i dakikalarca kilitler. Yalnızca HAVANNA_REMBG=1 iken çalışır.
    if (process.env.HAVANNA_REMBG === "1" && rembgAvailable()) {
      tempAlpha = path.join(
        outputDir,
        `.tmp-rembg-${crypto.randomBytes(4).toString("hex")}.png`
      );
      runRembg(inputPath, tempAlpha);
      working = tempAlpha;
    } else {
      tempAlpha = await removeFlatBackground(sharp, inputPath);
      if (tempAlpha) working = tempAlpha;
    }

    await (await centerOnTransparentCanvas(sharp, working)).toFile(outputPath);
    return { absolutePath: outputPath, relativePath: `images/uploads/${filename}`, filename };
  } finally {
    if (tempAlpha && tempAlpha !== inputPath && fs.existsSync(tempAlpha)) {
      try {
        fs.unlinkSync(tempAlpha);
      } catch (_) {}
    }
  }
}

module.exports = {
  processProductImage,
  buildProductImageFilename,
  sanitizeProductFileBase,
  rembgAvailable,
};
