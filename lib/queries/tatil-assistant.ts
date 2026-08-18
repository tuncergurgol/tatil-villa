import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/queries/company-settings";

export const DEFAULT_ASSISTANT_WELCOME =
  "Merhaba! Ben Tatil Asistanınız YumYum 🐝 Villa kiralama konusunda size yardımcı olabilirim. Hitap edebilmem için adınızı öğrenebilir miyim?";

export const DEFAULT_ASSISTANT_RULES = [
  {
    title: "Karşılama ve isim",
    content:
      "Misafirin adını öğrendikten sonra hemen 2. soruya geç. Örnek: \"Merhaba Ahmet, hangi tarihlerde konaklamak istiyorsunuz?\" Adı her cevapta kullan.",
    sortOrder: 1,
  },
  {
    title: "Konaklama bilgi toplama sırası",
    content:
      "Villa araması için sırayla sor: (1) ad, (2) giriş-çıkış tarihleri, (3) kişi sayısı, (4) bölge tercihi, (5) istenen villa özellikleri. Eksik bilgi varsa aramayı başlatma.",
    sortOrder: 2,
  },
  {
    title: "Uygunluk arama",
    content:
      "Tüm kriterler toplandığında search_available_villas aracını kullan. Esnek tarih için ±10 gün öner. Sonuç yoksa kriterleri gevşetmeyi öner.",
    sortOrder: 3,
  },
  {
    title: "Sonuç sunumu",
    content:
      "En fazla 5 villa özetle: ad, bölge, kişi kapasitesi, gece sayısı, toplam fiyat (TL). Villa detay linki ver. Telefon varsa WhatsApp ile özet gönder.",
    sortOrder: 4,
  },
  {
    title: "Diğer hizmetler",
    content:
      "Uçak/otobüs: /bilet/ara | Otel: /otel | Tur: /tur | Araç kiralama: /arac-kiralama | VIP transfer: /vip-transfer | Feribot: /feribot. Konaklama dışı taleplerde ilgili sayfa linkini paylaş.",
    sortOrder: 5,
  },
];

export const DEFAULT_ASSISTANT_EXAMPLES = [
  {
    title: "Karşılama",
    examples: [
      {
        question: "Ahmet",
        answer: "Merhaba Ahmet, hangi tarihlerde konaklamak istiyorsunuz?",
      },
    ],
  },
  {
    title: "Tarih ve kişi",
    examples: [
      {
        question: "Ağustos ortası Kalkan'da villa arıyorum",
        answer:
          "Harika seçim! Tam tarihlerinizi öğrenebilir miyim? (ör. 10-17 Ağustos) Kaç kişilik bir konaklama planlıyorsunuz?",
      },
    ],
  },
  {
    title: "Özellikler",
    examples: [
      {
        question: "Havuzlu ve deniz manzaralı olsun",
        answer:
          "Not aldım: özel havuz ve deniz manzarası. Başka önemli bir özellik var mı? (jakuzi, çocuk havuzu, merkeze yakın vb.)",
      },
    ],
  },
];

export async function ensureTatilAssistantDefaults() {
  const [topicCount, ruleCount] = await Promise.all([
    prisma.tatilAssistantTopic.count(),
    prisma.tatilAssistantRule.count(),
  ]);

  if (ruleCount === 0) {
    await prisma.tatilAssistantRule.createMany({
      data: DEFAULT_ASSISTANT_RULES,
    });
  }

  if (topicCount === 0) {
    for (const [topicIndex, topic] of DEFAULT_ASSISTANT_EXAMPLES.entries()) {
      const created = await prisma.tatilAssistantTopic.create({
        data: {
          title: topic.title,
          sortOrder: topicIndex + 1,
          examples: {
            create: topic.examples.map((item, exampleIndex) => ({
              question: item.question,
              answer: item.answer,
              sortOrder: exampleIndex + 1,
            })),
          },
        },
      });
      void created;
    }
  }
}

export async function getTatilAssistantAdminData() {
  await ensureTatilAssistantDefaults();
  const settings = await getCompanySettings();

  const [topics, rules] = await Promise.all([
    prisma.tatilAssistantTopic.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        examples: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
    }),
    prisma.tatilAssistantRule.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
  ]);

  return {
    enabled: settings.tatilAssistantEnabled ?? false,
    welcomeMessage:
      settings.assistantWelcomeMessage?.trim() || DEFAULT_ASSISTANT_WELCOME,
    ...(() => {
      const waha = getAssistantWahaConfig(settings);
      return {
        assistantWahaBaseUrl: waha.baseUrl,
        assistantWahaApiKey: waha.apiKey,
        assistantWahaSessionName: waha.sessionName,
      };
    })(),
    assistantWebhookSecret: settings.assistantWebhookSecret?.trim() || "",
    defaultPairingPhone: "905496180108",
    topics,
    rules,
  };
}

export async function getTatilAssistantRuntimeContext() {
  const settings = await getCompanySettings();

  if (!settings.tatilAssistantEnabled) {
    return null;
  }

  await ensureTatilAssistantDefaults();

  const [topics, rules] = await Promise.all([
    prisma.tatilAssistantTopic.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        examples: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
    }),
    prisma.tatilAssistantRule.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
  ]);

  return {
    welcomeMessage:
      settings.assistantWelcomeMessage?.trim() || DEFAULT_ASSISTANT_WELCOME,
    publicDomain: settings.domain,
    topics,
    rules,
    waha: getAssistantWahaConfig(settings),
  };
}

export function getAssistantWahaConfig(
  settings: Awaited<ReturnType<typeof getCompanySettings>>
) {
  return {
    baseUrl:
      settings.assistantWahaBaseUrl?.trim() ||
      settings.wahaBaseUrl?.trim() ||
      process.env.WAHA_BASE_URL?.trim() ||
      "http://localhost:3001",
    apiKey:
      settings.assistantWahaApiKey?.trim() ||
      settings.wahaApiKey?.trim() ||
      process.env.WAHA_API_KEY?.trim() ||
      "",
    sessionName:
      settings.assistantWahaSessionName?.trim() || "tatil-asistani",
    webhookSecret: settings.assistantWebhookSecret?.trim() || "",
  };
}
