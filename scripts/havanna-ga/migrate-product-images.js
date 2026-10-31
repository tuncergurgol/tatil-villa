#!/usr/bin/env node
/**
 * Mevcut ürün görsellerini: arka plan temizle → ortala → webp → yeni isim.
 */
const fs = require("fs");
const path = require("path");
const { processProductImage, rembgAvailable } = require("./product-image");

const ROOT = "/var/www/havanna-global";
const PRODUCTS = path.join(ROOT, "data", "products.json");
const UPLOAD_DIR = path.join(ROOT, "images", "uploads");
const BACKUP_DIR = path.join(ROOT, "images", "_pre-webp-backup");

async function main() {
  console.log("rembg:", rembgAvailable());
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const products = JSON.parse(fs.readFileSync(PRODUCTS, "utf8"));
  let changed = 0;
  const report = [];
  const toDelete = [];

  for (const product of products) {
    const prev =
      Array.isArray(product.images) && product.images.length
        ? product.images
        : product.image
          ? [product.image]
          : [];
    if (!prev.length) continue;

    // Zaten yeni formatta webp ise atla
    const allDone = prev.every(
      (rel) =>
        /-Havanna-.+\.webp$/i.test(path.basename(rel)) &&
        fs.existsSync(path.join(ROOT, rel))
    );
    if (allDone) {
      report.push(`SKIP ${product.name}`);
      continue;
    }

    const nextImages = [];
    for (let i = 0; i < prev.length; i += 1) {
      const rel = prev[i];
      const abs = path.join(ROOT, rel);
      if (!fs.existsSync(abs)) {
        report.push(`MISSING ${product.id} ${rel}`);
        continue;
      }

      if (/-Havanna-.+\.webp$/i.test(path.basename(rel))) {
        nextImages.push(rel);
        continue;
      }

      const before = fs.statSync(abs).size;
      console.log(`Processing ${product.name} [${i + 1}/${prev.length}] ${rel} ...`);
      const processed = await processProductImage({
        inputPath: abs,
        outputDir: UPLOAD_DIR,
        productName: product.name,
        seq: `${i + 1}${Date.now().toString(36).slice(-4)}`,
      });
      nextImages.push(processed.relativePath);
      const after = fs.statSync(processed.absolutePath).size;
      report.push(
        `OK ${product.name}: ${rel} (${before}) -> ${processed.filename} (${after})`
      );
      console.log(`  -> ${processed.filename} ${(after / 1024).toFixed(0)}KB`);

      if (path.resolve(abs) !== path.resolve(processed.absolutePath)) {
        // Yedekle, silmeyi sona bırak
        const bakName = `${product.id}-${i}-${path.basename(abs)}`;
        try {
          fs.copyFileSync(abs, path.join(BACKUP_DIR, bakName));
        } catch (_) {}
        toDelete.push(abs);
      }
    }

    if (nextImages.length) {
      product.image = nextImages[0];
      product.images = nextImages;
      changed += 1;
      // Ara kayıt — yarım kalırsa en azından işlenenler JSON'da kalsın
      fs.writeFileSync(PRODUCTS, JSON.stringify(products, null, 2) + "\n", "utf8");
    }
  }

  fs.writeFileSync(PRODUCTS, JSON.stringify(products, null, 2) + "\n", "utf8");

  for (const abs of toDelete) {
    try {
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch (_) {}
  }

  console.log(report.join("\n"));
  console.log(`\nUpdated products: ${changed}`);
  console.log(`Backup: ${BACKUP_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
