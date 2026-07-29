/** Admin paneldeki "25-69 yaş" gibi etiketleri Yolcu360 API yaş değerine çevirir. */
export function parseYolcu360DriverAge(label: string): string {
  const trimmed = label.trim();
  const plusMatch = /^(\d+)\+/.exec(trimmed);
  if (plusMatch) return plusMatch[1];

  const rangeMatch = /^(\d+)\s*-\s*(\d+)/.exec(trimmed);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    return String(Math.floor((min + max) / 2));
  }

  const digits = trimmed.replace(/\D/g, "");
  return digits || "30";
}
