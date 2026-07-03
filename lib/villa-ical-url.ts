export function buildVillaIcalExportUrl(
  apiDomain: string,
  villaId: string,
  token: string
) {
  const host = apiDomain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  return `https://api.${host}/ics/${villaId}/${token}.ics`;
}
