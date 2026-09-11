const TOKEN = "X7KpR9sT2wY1zN";
const VILLA_ID = "57";
const BASE = "https://www.tatilvillasi.com.tr";

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
      Referer: `${BASE}/villalar/mulberry-collection-violet`,
    },
  });
  return res.json();
}

function summarizeRanges(dates: string[]) {
  if (!dates.length) return [];
  const sorted = [...dates].sort();
  const ranges: string[] = [];
  let start = sorted[0]!;
  let prev = sorted[0]!;
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i]!;
    const prevDate = new Date(prev);
    prevDate.setDate(prevDate.getDate() + 1);
    const expected = prevDate.toISOString().slice(0, 10);
    if (d !== expected) {
      ranges.push(`${start} → ${prev}`);
      start = d;
    }
    prev = d;
  }
  ranges.push(`${start} → ${prev}`);
  return ranges;
}

async function main() {
  const availability = await get(
    `/api/availabilitys_function?villas=${VILLA_ID}&token=${TOKEN}`
  );
  const occupied = await get(
    `/api/availabilitys_function/occupied-dates?token=${TOKEN}&villas=${VILLA_ID}`
  );

  const availItems = (availability.data ?? []).map(
    (row: { availability_data?: { json?: Record<string, unknown> } }) =>
      row.availability_data?.json
  );

  console.log("availability blocks:", availItems.length);
  for (const item of availItems) {
    console.log(
      `- ${item?.check_in} → ${item?.check_out} | status=${item?.availabilitys_status} | comment=${item?.comment}`
    );
  }

  const occupiedDates: string[] = occupied.dates ?? [];
  console.log("\noccupied-dates count:", occupiedDates.length);
  console.log("aug 2026 occupied:", occupiedDates.filter((d) => d.startsWith("2026-08")));
  console.log("sep 2026 occupied:", occupiedDates.filter((d) => d.startsWith("2026-09")).length);
  console.log("first 10 ranges occupied:", summarizeRanges(occupiedDates).slice(0, 8));
}

main();
