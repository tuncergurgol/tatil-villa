/**
 * YumYum müşteri denemesi.
 * 0546 645 60 72 numarasından, Tatildeyiz WhatsApp hattına (0252 618 01 08)
 * 20 farklı tarih ve özellik sorgusu yollar.
 *
 *   node --env-file=.env ./node_modules/tsx/dist/cli.mjs scripts/yumyum-customer-trial.ts
 */
import { prisma } from "../lib/db";
import { processAssistantMessage } from "../lib/tatil-assistant-runner";
import { ASSISTANT_REFRESH_CRITERIA_MESSAGE } from "../lib/tatil-assistant-format";

const CUSTOMER_PHONE = "0546 645 60 72";
const CUSTOMER_CHAT = "905466456072@c.us";

const SCENARIOS: Array<{
  name: string;
  dates: string;
  adults: number;
  region: string;
  amenities: string;
}> = [
  { name: "Deneme Ayşe", dates: "10.06.2027 - 17.06.2027", adults: 4, region: "Kalkan", amenities: "özel havuz" },
  { name: "Deneme Mehmet", dates: "03.07.2027 - 10.07.2027", adults: 6, region: "Fethiye", amenities: "deniz manzarası" },
  { name: "Deneme Elif", dates: "15.07.2027 - 22.07.2027", adults: 2, region: "Kaş", amenities: "jakuzi" },
  { name: "Deneme Can", dates: "01.08.2027 - 08.08.2027", adults: 8, region: "Ölüdeniz", amenities: "çocuk havuzu" },
  { name: "Deneme Zeynep", dates: "20.08.2027 - 27.08.2027", adults: 5, region: "Bodrum", amenities: "klima" },
  { name: "Deneme Burak", dates: "05.09.2027 - 12.09.2027", adults: 4, region: "Dalyan", amenities: "merkeze yakın" },
  { name: "Deneme Selin", dates: "12.06.2027 - 19.06.2027", adults: 3, region: "Göcek", amenities: "özel havuz ve jakuzi" },
  { name: "Deneme Emre", dates: "18.07.2027 - 25.07.2027", adults: 6, region: "Marmaris", amenities: "deniz manzarası ve klima" },
  { name: "Deneme Naz", dates: "02.08.2027 - 09.08.2027", adults: 4, region: "Datça", amenities: "fark etmez" },
  { name: "Deneme Kaan", dates: "22.12.2026 - 27.12.2026", adults: 2, region: "Sapanca", amenities: "jakuzi" },
  { name: "Deneme Ece", dates: "14.06.2027 - 21.06.2027", adults: 7, region: "Kalkan", amenities: "çocuk havuzu" },
  { name: "Deneme Ali", dates: "09.07.2027 - 16.07.2027", adults: 4, region: "Fethiye", amenities: "özel havuz" },
  { name: "Deneme Derya", dates: "28.07.2027 - 04.08.2027", adults: 5, region: "Kaş", amenities: "deniz manzarası" },
  { name: "Deneme Mert", dates: "11.08.2027 - 18.08.2027", adults: 3, region: "Ölüdeniz", amenities: "klima" },
  { name: "Deneme Seda", dates: "01.09.2027 - 08.09.2027", adults: 6, region: "Bodrum", amenities: "özel havuz" },
  { name: "Deneme Okan", dates: "16.06.2027 - 23.06.2027", adults: 4, region: "Dalyan", amenities: "jakuzi" },
  { name: "Deneme İrem", dates: "25.07.2027 - 01.08.2027", adults: 8, region: "Göcek", amenities: "çocuk havuzu ve özel havuz" },
  { name: "Deneme Tolga", dates: "08.08.2027 - 15.08.2027", adults: 2, region: "Marmaris", amenities: "merkeze yakın" },
  { name: "Deneme Pınar", dates: "19.08.2027 - 26.08.2027", adults: 5, region: "Datça", amenities: "deniz manzarası" },
  { name: "Deneme Hakan", dates: "26.12.2026 - 02.01.2027", adults: 4, region: "Sapanca", amenities: "klima ve jakuzi" },
];

type OptionRow = { name: string; price: number | null };

function parseOptions(reply: string): OptionRow[] {
  const rows: OptionRow[] = [];
  for (const block of reply.split(/\n(?=\d+\.\s)/)) {
    const name = block.match(/^\d+\.\s+(.+?)\s+\(/)?.[1]?.trim();
    if (!name) continue;
    const raw = block.match(/([\d.]+)\s+TL/)?.[1];
    const price = raw ? Number(raw.replace(/\./g, "")) : null;
    rows.push({ name, price: Number.isFinite(price) ? price : null });
  }
  return rows;
}

function pricesAscend(rows: OptionRow[]) {
  const prices = rows.map((row) => row.price).filter((price): price is number => price != null);
  if (prices.length < 2) return prices.length === rows.length;
  return prices.every((price, index) => index === 0 || price >= prices[index - 1]!);
}

async function say(conversationId: string | undefined, message: string) {
  return processAssistantMessage({
    conversationId,
    message,
    channel: "whatsapp",
    whatsappChatId: CUSTOMER_CHAT,
    guestPhone: CUSTOMER_PHONE,
  });
}

async function main() {
  await prisma.companySettings.update({
    where: { id: "default" },
    data: { tatilAssistantEnabled: true },
  });

  const report: Array<Record<string, unknown>> = [];

  for (const [index, scenario] of SCENARIOS.entries()) {
    const started = Date.now();
    let conversationId: string | undefined;
    try {
      const steps = [
        scenario.name,
        scenario.dates,
        String(scenario.adults),
        scenario.region,
        scenario.amenities,
        CUSTOMER_PHONE,
      ];
      let lastReply = "";
      let whatsappSent = false;
      for (const message of steps) {
        const result = await say(conversationId, message);
        conversationId = result.conversationId;
        lastReply = result.reply;
        whatsappSent = result.whatsappSent === true;
      }

      const first = parseOptions(lastReply);
      const rounds: Array<Record<string, unknown>> = [
        {
          kind: "ilk",
          count: first.length,
          ascending: pricesAscend(first),
          whatsappSent,
          names: first.map((row) => row.name),
          prices: first.map((row) => row.price),
        },
      ];

      const seen = new Set(first.map((row) => row.name));
      let refreshedAt: number | null = null;
      for (let more = 1; more <= 4; more += 1) {
        const result = await say(conversationId, "Başka Yokmu");
        conversationId = result.conversationId;
        const refreshed = result.reply.includes(ASSISTANT_REFRESH_CRITERIA_MESSAGE);
        const options = parseOptions(result.reply);
        const overlap = options.filter((row) => seen.has(row.name)).map((row) => row.name);
        for (const row of options) seen.add(row.name);
        rounds.push({
          kind: `baska-${more}`,
          count: options.length,
          ascending: pricesAscend(options),
          overlap,
          refreshed,
          whatsappSent: result.whatsappSent === true,
          names: options.map((row) => row.name),
          prices: options.map((row) => row.price),
        });
        if (refreshed) {
          refreshedAt = more;
          break;
        }
      }

      const firstOk = first.length > 0 && first.length <= 5 && pricesAscend(first);
      const moreRounds = rounds.slice(1).filter((round) => round.refreshed !== true);
      const moreOk = moreRounds.every(
        (round) =>
          Number(round.count) > 0 &&
          Number(round.count) <= 4 &&
          round.ascending === true &&
          Array.isArray(round.overlap) &&
          round.overlap.length === 0
      );
      report.push({
        index: index + 1,
        scenario,
        conversationId,
        ok: firstOk && moreOk && refreshedAt != null,
        firstCount: first.length,
        refreshedAt,
        ms: Date.now() - started,
        rounds,
      });
      console.log(
        `#${index + 1} ${scenario.region} ${scenario.dates} ilk=${first.length} yenileme=${refreshedAt ?? "-"} ${Date.now() - started}ms`
      );
    } catch (error) {
      report.push({
        index: index + 1,
        scenario,
        conversationId,
        ok: false,
        error: error instanceof Error ? error.message : "sorgu başarısız",
        ms: Date.now() - started,
      });
      console.log(
        `#${index + 1} HATA ${error instanceof Error ? error.message : "sorgu başarısız"}`
      );
    }
  }

  const passed = report.filter((row) => row.ok === true).length;
  console.log(`SONUC ${passed}/${report.length}`);
  console.log(JSON.stringify(report));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
