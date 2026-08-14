import fs from "fs";

const URL = "https://www.villajoye.com/ilanlar/villa-oliva-nera/";

async function main() {
  const res = await fetch(URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  const html = await res.text();
  fs.writeFileSync("scripts/villajoye-sample.html", html);

  const idx = html.indexOf("zazen");
  if (idx >= 0) {
    console.log(html.slice(Math.max(0, idx - 200), idx + 4000));
  }

  const rowRe =
    /<tr[^>]*>[\s\S]*?zazen[\s\S]*?<\/tr>/gi;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    i++;
    console.log(`\n--- ROW ${i} ---\n`, m[0].slice(0, 800));
  }
}

main().catch(console.error);
