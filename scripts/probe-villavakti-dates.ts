async function main() {
  const res = await fetch("https://www.villavakti.com/api.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: "https://www.villavakti.com/tr/villa-emir-gocek",
    },
    body: "villa_id=3947&type=villa_dates",
  });
  const text = await res.text();
  console.log("status", res.status, "len", text.length);
  const parts = text.split("|");
  console.log("parts", parts.length);
  for (let i = 0; i < parts.length; i++) {
    const keys = parts[i]!.split(",").filter(Boolean);
    console.log(`part[${i}] count=${keys.length} sample=`, keys.slice(0, 8));
  }
  console.log("raw head", text.slice(0, 400));
  console.log("raw mid", text.slice(Math.floor(text.length / 2), Math.floor(text.length / 2) + 200));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
