import fs from "fs";
import path from "path";
import { createCanvas, Image } from "canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

globalThis.Image = Image;

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }

  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

async function main() {
  const pdfPath = "c:/Users/BARAN/Downloads/Screenshot 2024-08-28 at 20.31.49.pdf";
  const outDir = "c:/Users/BARAN/OneDrive/Desktop/PROJELER/tatil-villa/.tmp-havanna-pdf";
  fs.mkdirSync(outDir, { recursive: true });

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data }).promise;
  const canvasFactory = new NodeCanvasFactory();

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });
    const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
    await page.render({
      canvasContext: canvasAndContext.context,
      viewport,
      canvasFactory,
    }).promise;
    const outPath = path.join(outDir, `page-${pageNum}.png`);
    fs.writeFileSync(outPath, canvasAndContext.canvas.toBuffer("image/png"));
    canvasFactory.destroy(canvasAndContext);
    console.log("wrote", outPath);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
