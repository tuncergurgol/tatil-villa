const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");
const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");

async function main() {
  const pdfPath = "c:/Users/BARAN/Downloads/Screenshot 2024-08-28 at 20.31.49.pdf";
  const outDir = "c:/Users/BARAN/OneDrive/Desktop/PROJELER/tatil-villa/.tmp-havanna-pdf";
  fs.mkdirSync(outDir, { recursive: true });

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data }).promise;

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport }).promise;
    const outPath = path.join(outDir, `page-${pageNum}.png`);
    fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
    console.log("wrote", outPath);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
