import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

const outDir = "c:/Users/BARAN/OneDrive/Desktop/PROJELER/tatil-villa/.tmp-havanna-pdf";
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1800 });

for (let pageNum = 1; pageNum <= 3; pageNum += 1) {
  await page.goto(`http://localhost:3456/havanna-source.pdf#page=${pageNum}`, {
    waitUntil: "networkidle0",
  });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const outPath = path.join(outDir, `rendered-page-${pageNum}.png`);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log("saved", outPath);
}

await browser.close();
