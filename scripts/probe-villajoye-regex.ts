import fs from "fs";

const html = fs.readFileSync("scripts/villajoye-sample.html", "utf8");
const blockRe =
  /<td[^>]*class=['"]zazen['"][^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*class=['"]sazen['"][^>]*>[\s\S]*?Minimum Kiralama:\s*(\d+)\s*gece[\s\S]*?Gecelik<br>\s*([\d.,]+)\s*(TRY|TL|EUR|USD|GBP)/gi;
let match: RegExpExecArray | null;
while ((match = blockRe.exec(html)) !== null) {
  console.log({
    range: match[1],
    min: match[2],
    price: match[3],
    cur: match[4],
  });
}
