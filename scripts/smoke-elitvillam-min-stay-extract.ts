import assert from "node:assert/strict";
import { extractScrapedPeriodDefaults } from "../lib/external-villa-page-scrape";

const html = `
<div class="im">Aylara göre 7 gecelik (haftalık) konaklama fiyatları yukarıda belirtilmiştir. Fiyatlar 2027 yılı için geçerlidir.</div>
`;
const defaults = extractScrapedPeriodDefaults(html);
assert.equal(defaults.minStayNights, 7);
console.log("ok: elitvillam weekly min stay =", defaults.minStayNights);
