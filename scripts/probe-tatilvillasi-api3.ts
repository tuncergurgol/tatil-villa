const TOKEN = "X7KpR9sT2wY1zN";
const VILLA_ID = "57";
const SLUG = "mulberry-collection-violet";
const BASE = "https://www.tatilvillasi.com.tr";

async function get(path: string) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
      Referer: `${BASE}/villalar/${SLUG}`,
    },
  });
  const text = await res.text();
  console.log("\n", url, res.status);
  try {
    const json = JSON.parse(text);
    console.log(JSON.stringify(json, null, 2).slice(0, 4000));
    return json;
  } catch {
    console.log(text.slice(0, 500));
    return null;
  }
}

async function main() {
  await get(`/api/prices_function?villas=${VILLA_ID}&token=${TOKEN}`);
  await get(`/api/prices_function?villa=${VILLA_ID}&token=${TOKEN}`);
  await get(`/api/prices_function?slug=${SLUG}&token=${TOKEN}`);
  await get(`/api/availabilitys_function?villas=${VILLA_ID}&token=${TOKEN}`);
  await get(`/api/availabilitys_function?villa=${VILLA_ID}&token=${TOKEN}`);
  await get(`/api/availabilitys_function/occupied-dates?token=${TOKEN}&villas=${VILLA_ID}`);
  await get(`/api/availabilitys_function/occupied-dates?token=${TOKEN}&villa=${VILLA_ID}`);
  await get(`/api/villas_function?slug=${SLUG}&token=${TOKEN}`);
}

main();
