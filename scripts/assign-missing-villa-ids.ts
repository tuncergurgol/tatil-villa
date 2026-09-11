import { assignMissingVillaNumericIds } from "../lib/villa-numeric-id";

async function main() {
  const assigned = await assignMissingVillaNumericIds();
  if (assigned.length === 0) {
    console.log("Villa ID'si eksik villa yok.");
    return;
  }

  console.log(`${assigned.length} villaya Villa ID verildi:`);
  for (const row of assigned) {
    console.log(`  ${row.villaId}  ${row.name}  (${row.id})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
