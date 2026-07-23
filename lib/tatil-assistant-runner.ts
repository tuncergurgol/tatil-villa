import { prisma } from "@/lib/db";
import {
  searchAvailability,
  type AvailabilitySearchResultItem,
} from "@/lib/queries/availability-search";
import {
  DEFAULT_ASSISTANT_WELCOME,
  getTatilAssistantRuntimeContext,
} from "@/lib/queries/tatil-assistant";
import {
  formatAssistantVillasForChat,
  formatAssistantVillasForWhatsApp,
} from "@/lib/tatil-assistant-format";
import { sendAssistantWhatsAppMessage } from "@/lib/tatil-assistant-whatsapp";

export type AssistantSearchState = {
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  regionSlugs?: string[];
  amenityNames?: string[];
};

type OpenAiToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type ProcessAssistantInput = {
  conversationId?: string;
  message: string;
  channel?: "web" | "whatsapp";
  whatsappChatId?: string;
  guestPhone?: string;
};

export type ProcessAssistantResult = {
  conversationId: string;
  reply: string;
  villas?: ReturnType<typeof formatAssistantVillasForChat>;
  whatsappSent?: boolean;
};

const SEARCH_TOOL = {
  type: "function" as const,
  function: {
    name: "search_available_villas",
    description:
      "UYGUNLUK ARA kriterleriyle müsait villaları listeler. Tarih, kişi sayısı ve bölge bilgisi olmadan çağırma.",
    parameters: {
      type: "object",
      properties: {
        checkIn: { type: "string", description: "YYYY-MM-DD giriş" },
        checkOut: { type: "string", description: "YYYY-MM-DD çıkış" },
        adults: { type: "number", description: "Yetişkin / toplam kişi sayısı" },
        regionSlugs: {
          type: "array",
          items: { type: "string" },
          description: "Bölge slug listesi (ör. kalkan, fethiye)",
        },
        amenityNames: {
          type: "array",
          items: { type: "string" },
          description: "İstenen villa özellikleri (Türkçe isimler)",
        },
        flexibleDate: {
          type: "boolean",
          description: "±10 gün esnek tarih araması",
        },
        guestName: { type: "string" },
        guestPhone: { type: "string" },
      },
      required: ["checkIn", "checkOut", "adults"],
    },
  },
};

function buildSystemPrompt(
  welcomeMessage: string,
  rules: { title: string; content: string }[],
  topics: {
    title: string;
    examples: { question: string; answer: string }[];
  }[]
) {
  const rulesBlock = rules
    .map((rule, index) => `${index + 1}. ${rule.title}\n${rule.content}`)
    .join("\n\n");

  const examplesBlock = topics
    .map((topic) => {
      const pairs = topic.examples
        .map((ex) => `S: ${ex.question}\nC: ${ex.answer}`)
        .join("\n");
      return `### ${topic.title}\n${pairs}`;
    })
    .join("\n\n");

  return `Sen Tatil Asistanı YumYum'sun — sevimli, yardımsever bir villa kiralama asistanısın (arı maskotu 🐝).

Görevin: öncelikle konaklama / villa kiralama taleplerinde misafire rehberlik etmek. Diğer hizmetler için ilgili sayfa linklerini ver.

Karşılama mesajı: ${welcomeMessage}

Sırayla toplaman gereken bilgiler:
1. Misafirin adı
2. Konaklama tarihleri (giriş-çıkış)
3. Kişi sayısı
4. Bölge tercihi
5. İstenen villa özellikleri

Kurallar (Öğrenme):
${rulesBlock}

Mesaj örnekleri (Öğrenme):
${examplesBlock}

Diğer hizmet linkleri (mutlak path kullan):
- Uçak/Otobüs: /bilet/ara
- Tur: /tur
- Araç kiralama: /arac-kiralama
- VIP transfer: /vip-transfer
- Feribot: /feribot

Teknik:
- Türkçe konuş, kısa ve samimi ol.
- Villa araması için yeterli bilgi toplandığında search_available_villas aracını çağır.
- Sonuçları özetle; fiyatları TL olarak yaz.
- Admin panel, bont.* veya localhost linki asla verme.`;
}

async function runVillaSearch(args: {
  checkIn: string;
  checkOut: string;
  adults: number;
  regionSlugs?: string[];
  amenityNames?: string[];
  flexibleDate?: boolean;
}) {
  return searchAvailability({
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    adults: args.adults,
    children: 0,
    babies: 0,
    regionSlugs: args.regionSlugs,
    amenityNames: args.amenityNames,
    flexibleDate: args.flexibleDate ?? true,
    fillEmptyDates: true,
    sort: "recommended",
  });
}

async function callOpenAi(
  systemPrompt: string,
  history: { role: string; content: string }[]
): Promise<{
  content: string | null;
  toolCalls: OpenAiToolCall[];
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      content:
        "Şu an yapay zeka servisim hazırlanıyor. Lütfen kısa süre sonra tekrar deneyin veya +90 252 618 01 08 numarasından bize ulaşın.",
      toolCalls: [],
    };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.6,
      messages: [{ role: "system", content: systemPrompt }, ...history],
      tools: [SEARCH_TOOL],
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    return {
      content:
        "Bir sorun oluştu, lütfen tekrar deneyin. Yardım için +90 252 618 01 08.",
      toolCalls: [],
    };
  }

  const data = (await response.json()) as {
    choices?: {
      message?: {
        content?: string | null;
        tool_calls?: OpenAiToolCall[];
      };
    }[];
  };

  const message = data.choices?.[0]?.message;
  return {
    content: message?.content ?? null,
    toolCalls: message?.tool_calls ?? [],
  };
}

function mergeSearchState(
  current: AssistantSearchState | null | undefined,
  patch: Partial<AssistantSearchState>
): AssistantSearchState {
  return { ...(current ?? {}), ...patch };
}

export async function processAssistantMessage(
  input: ProcessAssistantInput
): Promise<ProcessAssistantResult> {
  const context = await getTatilAssistantRuntimeContext();
  if (!context) {
    throw new Error("Tatil Asistanı şu an aktif değil");
  }

  const channel = input.channel ?? "web";
  let conversation =
    input.conversationId &&
    (await prisma.tatilAssistantConversation.findUnique({
      where: { id: input.conversationId },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 30 },
      },
    }));

  if (!conversation && input.whatsappChatId) {
    conversation = await prisma.tatilAssistantConversation.findFirst({
      where: { whatsappChatId: input.whatsappChatId, status: "active" },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 30 },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (!conversation) {
    conversation = await prisma.tatilAssistantConversation.create({
      data: {
        channel,
        whatsappChatId: input.whatsappChatId,
        guestPhone: input.guestPhone,
        searchState: {},
        messages: {
          create: {
            role: "assistant",
            content: context.welcomeMessage || DEFAULT_ASSISTANT_WELCOME,
          },
        },
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  const userText = input.message.trim();
  if (!userText) {
    const lastAssistant = [...conversation.messages]
      .reverse()
      .find((m) => m.role === "assistant");
    return {
      conversationId: conversation.id,
      reply: lastAssistant?.content ?? context.welcomeMessage,
    };
  }

  await prisma.tatilAssistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: userText,
    },
  });

  const systemPrompt = buildSystemPrompt(
    context.welcomeMessage,
    context.rules,
    context.topics
  );

  const history = [
    ...conversation.messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    { role: "user", content: userText },
  ];

  let aiResult = await callOpenAi(systemPrompt, history);
  let searchResults: AvailabilitySearchResultItem[] = [];
  let searchState = (conversation.searchState ?? {}) as AssistantSearchState;

  if (aiResult.toolCalls.length > 0) {
    const toolMessages: { role: string; content: string; tool_call_id?: string }[] =
      [];

    for (const toolCall of aiResult.toolCalls) {
      if (toolCall.function.name !== "search_available_villas") continue;

      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
      } catch {
        parsed = {};
      }

      searchState = mergeSearchState(searchState, {
        guestName:
          typeof parsed.guestName === "string" ? parsed.guestName : searchState.guestName,
        guestPhone:
          typeof parsed.guestPhone === "string"
            ? parsed.guestPhone
            : searchState.guestPhone ?? input.guestPhone,
        checkIn:
          typeof parsed.checkIn === "string" ? parsed.checkIn : searchState.checkIn,
        checkOut:
          typeof parsed.checkOut === "string" ? parsed.checkOut : searchState.checkOut,
        adults:
          typeof parsed.adults === "number" ? parsed.adults : searchState.adults,
        regionSlugs: Array.isArray(parsed.regionSlugs)
          ? (parsed.regionSlugs as string[])
          : searchState.regionSlugs,
        amenityNames: Array.isArray(parsed.amenityNames)
          ? (parsed.amenityNames as string[])
          : searchState.amenityNames,
      });

      if (searchState.checkIn && searchState.checkOut && searchState.adults) {
        searchResults = await runVillaSearch({
          checkIn: searchState.checkIn,
          checkOut: searchState.checkOut,
          adults: searchState.adults,
          regionSlugs: searchState.regionSlugs,
          amenityNames: searchState.amenityNames,
          flexibleDate: parsed.flexibleDate === true || true,
        });
      }

      toolMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify({
          count: searchResults.length,
          villas: formatAssistantVillasForChat(
            searchResults,
            context.publicDomain
          ),
        }),
      });
    }

    const followUp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.6,
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          {
            role: "assistant",
            content: aiResult.content,
            tool_calls: aiResult.toolCalls,
          },
          ...toolMessages,
        ],
      }),
    });

    if (followUp.ok) {
      const followData = (await followUp.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      aiResult = {
        content:
          followData.choices?.[0]?.message?.content ??
          "Arama tamamlandı, sonuçları aşağıda görebilirsiniz.",
        toolCalls: [],
      };
    }
  }

  const reply =
    aiResult.content?.trim() ||
    (searchResults.length > 0
      ? `${searchResults.length} uygun villa buldum. Detayları aşağıda paylaşıyorum.`
      : "Size nasıl yardımcı olabilirim?");

  let whatsappSent = false;
  const phone =
    searchState.guestPhone?.trim() ||
    conversation.guestPhone?.trim() ||
    input.guestPhone?.trim();

  if (searchResults.length > 0 && phone) {
    try {
      await sendAssistantWhatsAppMessage(
        phone,
        formatAssistantVillasForWhatsApp(
          searchResults,
          context.publicDomain,
          searchState.guestName ?? conversation.guestName
        )
      );
      whatsappSent = true;
    } catch {
      whatsappSent = false;
    }
  }

  await prisma.tatilAssistantConversation.update({
    where: { id: conversation.id },
    data: {
      guestName: searchState.guestName ?? conversation.guestName,
      guestPhone: phone ?? conversation.guestPhone,
      searchState,
    },
  });

  await prisma.tatilAssistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: reply,
      metadata: searchResults.length
        ? { villaCount: searchResults.length, whatsappSent }
        : undefined,
    },
  });

  return {
    conversationId: conversation.id,
    reply,
    villas:
      searchResults.length > 0
        ? formatAssistantVillasForChat(searchResults, context.publicDomain)
        : undefined,
    whatsappSent,
  };
}
