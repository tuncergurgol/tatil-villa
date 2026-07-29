/** Admin paneldeki "25-69 yaş" gibi etiketleri Yolcu360 API yaş değerine çevirir. */
export function parseYolcu360DriverAge(label: string): string {
  const trimmed = label.trim().toLowerCase();

  if (trimmed.includes("25") && trimmed.includes("69")) return "30-65";
  if (trimmed.includes("21") && trimmed.includes("24")) return "24";
  if (trimmed.includes("70")) return "70";

  const plusMatch = /^(\d+)\+/.exec(trimmed);
  if (plusMatch) {
    const age = Number(plusMatch[1]);
    return age >= 80 ? "80+" : String(age);
  }

  const rangeMatch = /^(\d+)\s*-\s*(\d+)/.exec(trimmed);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    if (min >= 30 && max >= 65) return "30-65";
    return String(Math.min(max, 29));
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits === "3065") return "30-65";
  return digits || "30-65";
}
