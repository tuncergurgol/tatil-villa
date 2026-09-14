import fs from "fs";
import { pdfToPng } from "pdf-to-png-converter";

const pdfPath = "c:/Users/BARAN/Downloads/Screenshot 2024-08-28 at 20.31.49.pdf";
const outDir = "c:/Users/BARAN/OneDrive/Desktop/PROJELER/tatil-villa/.tmp-havanna-pdf";
fs.mkdirSync(outDir, { recursive: true });

const pages = await pdfToPng(pdfPath, {
  disableFontFace: true,
  useSystemFonts: true,
  viewportScale: 2.0,
  outputFolder: outDir,
  outputFileMaskFunc: (pageNumber) => `extracted-page-${pageNumber}`,
});

console.log("pages", pages.length);
for (const page of pages) {
  console.log(page.path ?? page.fileName ?? page);
}
