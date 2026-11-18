import { findCustomerByPhone } from "@/lib/customer-crm";
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
  ASSISTANT_FIRST_OPTION_COUNT,
  ASSISTANT_MAX_MORE_ROUNDS,
  ASSISTANT_MORE_OPTION_COUNT,
  ASSISTANT_REFRESH_CRITERIA_MESSAGE,
  formatAssistantVillaOfferMessage,
  isAssistantMoreOptionsRequest,
  pricedAssistantVillas,
} from "@/lib/tatil-assistant-format";
import { createAssistantPublicShareLink } from "@/lib/tatil-assistant-share";
import { sendAssistantWhatsAppMessage } from "@/lib/tatil-assistant-whatsapp";
import {
  applyCriterionUpdate,
  buildConsultantOpening,
  isConversationGreeting,
  usablePersonName,
  buildFlowReply,
  extractGuestPhone,
  processFlowStep,
  resolveFlowStep,
} from "@/lib/tatil-assistant-flow";

import type { AssistantSearchState } from "@/lib/tatil-assistant-types";

export type { AssistantSearchState } from "@/lib/tatil-assistant-types";

type ProcessAssistantInput = {
  conversationId?: string;
  message: string;
  channel?: "web" | "whatsapp";
  whatsappChatId?: string;
  guestPhone?: string;
  /** Son kullanıcı mesajını yeniden işle; ikinci kez kaydetme. */
  reuseLastUserMessage?: boolean;
};

export type ProcessAssistantResult = {
  conversationId: string;
  reply: string;
  shareUrl?: string;
  whatsappSent?: boolean;
};

async function expandAssistantRegionSlugs(slugs: string[] | undefined) {
  if (!slugs?.length) return slugs;
  const regions = await prisma.region.findMany({
    where: { active: true },
    select: { slug: true, name: true },
  });
  const expanded = new Set<string>();
  for (const slug of slugs) {
    const needle = slug.toLocaleLowerCase("tr-TR");
    const hits = regions.filter((region) => {
      const regionSlug = region.slug.toLocaleLowerCase("tr-TR");
      const name = region.name.toLocaleLowerCase("tr-TR");
      return (
        regionSlug === needle ||
        regionSlug.startsWith(`${needle}-`) ||
        name === needle ||
        name.startsWith(`${needle} `)
      );
    });
    if (hits.length === 0) expanded.add(slug);
    else hits.forEach((hit) => expanded.add(hit.slug));
  }
  return [...expanded];
}

function matchFeatureName(
  names: { name: string }[],
  needle: string
) {
  const folded = needle.toLocaleLowerCase("tr-TR");
  return (
    names.find((item) => item.name.toLocaleLowerCase("tr-TR") === folded) ??
    names.find((item) => {
      const current = item.name.toLocaleLowerCase("tr-TR");
      return current.includes(folded) || folded.includes(current);
    })
  );
}

async function expandAssistantFeatures(names: string[] | undefined) {
  if (!names?.length) {
    return {
      amenityNames: undefined as string[] | undefined,
      facilityCategoryNames: undefined as string[] | undefined,
    };
  }
  const [amenities, categories] = await Promise.all([
    prisma.amenity.findMany({ where: { active: true }, select: { name: true } }),
    prisma.facilityCategory.findMany({
      where: { published: true },
      select: { name: true },
    }),
  ]);
  const amenityNames: string[] = [];
  const facilityCategoryNames: string[] = [];
  for (const name of names) {
    const category = matchFeatureName(categories, name);
    const amenity = matchFeatureName(amenities, name);
    if (category) facilityCategoryNames.push(category.name);
    else if (amenity) amenityNames.push(amenity.name);
    else amenityNames.push(name);
  }
  return {
    amenityNames: amenityNames.length ? [...new Set(amenityNames)] : undefined,
    facilityCategoryNames: facilityCategoryNames.length
      ? [...new Set(facilityCategoryNames)]
      : undefined,
  };
}

async function runVillaSearch(args: {
  checkIn: string;
  checkOut: string;
  adults: number;
  guestCounts?: number[];
  regionSlugs?: string[];
  amenityNames?: string[];
  flexibleDate?: boolean;
}) {
  const [regionSlugs, features] = await Promise.all([
    expandAssistantRegionSlugs(args.regionSlugs),
    expandAssistantFeatures(args.amenityNames),
  ]);

  return searchAvailability({
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    adults: args.adults,
    children: 0,
    babies: 0,
    regionSlugs,
    amenityNames: features.amenityNames,
    facilityCategoryNames: features.facilityCategoryNames,
    guestCounts: args.guestCounts ?? (args.adults > 0 ? [args.adults] : []),
    flexibleDate: args.flexibleDate ?? false,
    fillEmptyDates: true,
    sort: "price_asc",
  });
}

const TATILDEYIZ_PUBLIC_DOMAIN = "www.tatildeyiz.com.tr";

function refreshCriteriaState(state: AssistantSearchState): AssistantSearchState {
  return {
    guestName: state.guestName,
    guestPhone: state.guestPhone,
    phoneCollected: Boolean(state.guestPhone?.trim()),
  };
}

function refreshCriteriaReply(_state: AssistantSearchState) {
  return `${ASSISTANT_REFRESH_CRITERIA_MESSAGE} Hangi tarihlerde konaklamak istiyorsunuz.`;
}

async function deliverAssistantOffers(input: {
  searchState: AssistantSearchState;
  phone?: string;
  more: boolean;
}) {
  const { searchState, phone, more } = input;
  const domain = TATILDEYIZ_PUBLIC_DOMAIN;

  if (
    !searchState.checkIn ||
    !searchState.checkOut ||
    (!searchState.adults && !searchState.guestsAny)
  ) {
    return {
      reply: "Arama için gerekli bilgiler eksik görünüyor.",
      searchState,
      searchResults: [] as AvailabilitySearchResultItem[],
      shareUrl: undefined as string | undefined,
      whatsappSent: false,
      refreshed: false,
    };
  }

  const moreRounds = searchState.moreOptionRounds ?? 0;
  if (more && moreRounds >= ASSISTANT_MAX_MORE_ROUNDS) {
    const nextState = refreshCriteriaState(searchState);
    const reply = refreshCriteriaReply(searchState);
    let whatsappSent = false;
    if (phone) {
      try {
        await sendAssistantWhatsAppMessage(phone, reply);
        whatsappSent = true;
      } catch {
        whatsappSent = false;
      }
    }
    return {
      reply,
      searchState: nextState,
      searchResults: [] as AvailabilitySearchResultItem[],
      shareUrl: undefined,
      whatsappSent,
      refreshed: true,
    };
  }

  const partySizes = searchState.guestsAny
    ? []
    : (
        searchState.partySizes?.length
          ? searchState.partySizes
          : [searchState.adults]
      ).filter((size): size is number => typeof size === "number" && size > 0);
  const regionSlugs = searchState.regionAny ? undefined : searchState.regionSlugs;

  const sent = new Set(searchState.sentVillaIds ?? []);
  const limit = more ? ASSISTANT_MORE_OPTION_COUNT : ASSISTANT_FIRST_OPTION_COUNT;
  type PartyResult = AvailabilitySearchResultItem & { partySize: number };
  const byId = new Map<string, PartyResult>();
  if (searchState.guestsAny) {
    const results = await runVillaSearch({
      checkIn: searchState.checkIn,
      checkOut: searchState.checkOut,
      adults: 0,
      guestCounts: [],
      regionSlugs,
      amenityNames: searchState.amenityNames,
      flexibleDate: false,
    });
    for (const item of pricedAssistantVillas(results)) {
      if (sent.has(item.id) || byId.has(item.id)) continue;
      byId.set(item.id, { ...item, partySize: item.guests || 0 });
    }
  }
  for (const partySize of partySizes) {
    const results = await runVillaSearch({
      checkIn: searchState.checkIn,
      checkOut: searchState.checkOut,
      adults: partySize,
      regionSlugs,
      amenityNames: searchState.amenityNames,
      flexibleDate: false,
    });
    for (const item of pricedAssistantVillas(results)) {
      if (sent.has(item.id) || byId.has(item.id)) continue;
      byId.set(item.id, { ...item, partySize });
    }
  }
  const ranked = [...byId.values()].sort(
    (left, right) =>
      left.quote.total - right.quote.total ||
      left.name.localeCompare(right.name, "tr")
  );
  const batch: PartyResult[] = [];
  const covered = new Set<number>();
  for (const item of ranked) {
    if (covered.has(item.partySize)) continue;
    batch.push(item);
    covered.add(item.partySize);
  }
  for (const item of ranked) {
    if (batch.length >= limit) break;
    if (batch.some((picked) => picked.id === item.id)) continue;
    batch.push(item);
  }
  const offerBatch = batch.slice(0, limit);

  if (offerBatch.length === 0) {
    const keepCriteria = !more;
    const nextState = keepCriteria ? searchState : refreshCriteriaState(searchState);
    const reply = keepCriteria
      ? "Bu kriterlerle uygun villa bulamadım. Tarih, bölge, kişi sayısı veya özelliği değiştirirseniz yeniden bakarım."
      : refreshCriteriaReply(searchState);
    let whatsappSent = false;
    if (phone) {
      try {
        await sendAssistantWhatsAppMessage(phone, reply);
        whatsappSent = true;
      } catch {
        whatsappSent = false;
      }
    }
    return {
      reply,
      searchState: nextState,
      searchResults: offerBatch,
      shareUrl: undefined,
      whatsappSent,
      refreshed: !keepCriteria,
    };
  }

  const shareUrl = await createAssistantPublicShareLink({
    villaIds: offerBatch.map((item) => item.id),
    checkIn: searchState.checkIn,
    checkOut: searchState.checkOut,
    adults: searchState.adults,
    domain,
  });

  const missingSizes = partySizes.filter(
    (size) => !offerBatch.some((item) => item.partySize === size)
  );
  const messages = [
    ...(missingSizes.length
      ? [
          `${missingSizes.join(" ve ")} kişilik villa bu kriterlerde çıkmadı.`,
        ]
      : []),
    ...offerBatch.map((item) =>
      formatAssistantVillaOfferMessage(item, {
        domain,
        guestName: searchState.guestName,
        adults: item.partySize,
        brand: "Tatildeyiz",
      })
    ),
  ];
  const reply = messages.join("\n\n");
  const deliveredIds: string[] = [];
  if (phone) {
    const preface = missingSizes.length ? messages[0] : "";
    const villaMessages = missingSizes.length ? messages.slice(1) : messages;
    const outbound = preface ? [preface, ...villaMessages] : villaMessages;
    for (const [index, text] of outbound.entries()) {
      try {
        await sendAssistantWhatsAppMessage(phone, text);
        if (!preface || index > 0) {
          deliveredIds.push(offerBatch[preface ? index - 1 : index]!.id);
        }
      } catch {
        break;
      }
      if (index < outbound.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
    }
  }
  const whatsappSent = !phone || deliveredIds.length > 0;

  const nextState: AssistantSearchState = {
    ...searchState,
    freshIntake: false,
    sentVillaIds: [
      ...sent,
      ...(phone ? deliveredIds : offerBatch.map((item) => item.id)),
    ],
    moreOptionRounds: more ? moreRounds + 1 : moreRounds,
  };

  return {
    reply,
    searchState: nextState,
    searchResults: offerBatch,
    shareUrl,
    whatsappSent,
    refreshed: false,
  };
}

function usableCustomerName(name: string | null | undefined) {
  return usablePersonName(name);
}

function persistedGuestName(
  ...names: Array<string | null | undefined>
) {
  for (const name of names) {
    const usable = usablePersonName(name);
    if (usable) return usable;
  }
  return null;
}

async function applyKnownCustomerName(
  state: AssistantSearchState,
  phone?: string | null
) {
  if (state.guestName?.trim() || !phone?.trim()) return state;
  const customer = await findCustomerByPhone(phone);
  const name = usableCustomerName(customer?.fullName);
  if (!name) return state;
  return { ...state, guestName: name };
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
        messages: { orderBy: { createdAt: "desc" }, take: 40 },
      },
    }));

  if (!conversation && input.whatsappChatId) {
    conversation = await prisma.tatilAssistantConversation.findFirst({
      where: { whatsappChatId: input.whatsappChatId, status: "active" },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 40 },
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

  if (conversation.messages.length > 1) {
    conversation.messages.reverse();
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

  const sameText = (left: string, right: string) =>
    left.replace(/\s+/g, " ").trim() === right.replace(/\s+/g, " ").trim();
  const recentUser = [...conversation.messages]
    .reverse()
    .find((message) => message.role === "user");
  if (!input.reuseLastUserMessage && recentUser && sameText(recentUser.content, userText)) {
    const age = Date.now() - new Date(recentUser.createdAt).getTime();
    const recentAssistant = [...conversation.messages]
      .reverse()
      .find(
        (message) =>
          message.role === "assistant" &&
          message.createdAt >= recentUser.createdAt
      );
    if (recentAssistant && age >= 0 && age < 20 * 60 * 1000) {
      return {
        conversationId: conversation.id,
        reply: recentAssistant.content,
        whatsappSent: true,
      };
    }
  }

  if (!input.reuseLastUserMessage) {
    await prisma.tatilAssistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: userText,
      },
    });
  }

  const storedState = (conversation.searchState ?? {}) as AssistantSearchState;
  let searchState = await applyKnownCustomerName(
    usablePersonName(storedState.guestName)
      ? storedState
      : { ...storedState, guestName: undefined },
    input.guestPhone || conversation.guestPhone
  );
  const priorUserTexts = conversation.messages
    .filter((message) => message.role === "user")
    .map((message) => message.content);
  const history = input.reuseLastUserMessage
    ? priorUserTexts.slice(0, -1)
    : priorUserTexts;
  if (
    !searchState.freshIntake &&
    !searchState.regionAny &&
    !searchState.guestsAny &&
    (!searchState.checkIn || !searchState.adults || !searchState.regionSlugs?.length)
  ) {
    let rebuilt: AssistantSearchState = {
      guestName: searchState.guestName,
      guestPhone: searchState.guestPhone || input.guestPhone || undefined,
      phoneCollected: Boolean(searchState.guestPhone || input.guestPhone),
      helpAsked: true,
    };
    for (const text of history) rebuilt = applyCriterionUpdate(rebuilt, text);
    if (rebuilt.checkIn || rebuilt.adults || rebuilt.regionSlugs?.length) {
      searchState = {
        ...rebuilt,
        guestName: searchState.guestName ?? rebuilt.guestName,
        guestPhone: searchState.guestPhone || rebuilt.guestPhone,
        phoneCollected: true,
        helpAsked: true,
      };
    }
  }
  let flowAdvance = processFlowStep(userText, searchState);

  if (flowAdvance.handled) {
    searchState = flowAdvance.state;

    if (
      !flowAdvance.readyToSearch &&
      resolveFlowStep(searchState) === "awaiting_phone" &&
      channel === "whatsapp" &&
      input.guestPhone
    ) {
      const normalized = extractGuestPhone(input.guestPhone);
      if (normalized) {
        searchState = {
          ...searchState,
          guestPhone: normalized,
          phoneCollected: true,
        };
        flowAdvance = {
          handled: true,
          reply: buildFlowReply("ready", searchState),
          state: searchState,
          readyToSearch: true,
        };
      }
    }

    let searchResults: AvailabilitySearchResultItem[] = [];
    let reply = flowAdvance.reply;
    let shareUrl: string | undefined;
    let whatsappSent = false;

    if (flowAdvance.readyToSearch) {
      const phone =
        searchState.guestPhone?.trim() ||
        conversation.guestPhone?.trim() ||
        input.guestPhone?.trim();

      const finalized = await deliverAssistantOffers({
        searchState,
        phone,
        more: false,
      });

      reply = finalized.reply;
      searchState = finalized.searchState;
      searchResults = finalized.searchResults;
      shareUrl = finalized.shareUrl;
      whatsappSent = finalized.whatsappSent;
    }

    const phone =
      searchState.guestPhone?.trim() ||
      conversation.guestPhone?.trim() ||
      input.guestPhone?.trim();

    await prisma.tatilAssistantConversation.update({
      where: { id: conversation.id },
      data: {
        guestName: persistedGuestName(searchState.guestName, conversation.guestName),
        guestPhone: phone ?? conversation.guestPhone,
        searchState,
      },
    });

    await prisma.tatilAssistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: reply,
        metadata: shareUrl
          ? { shareUrl, whatsappSent, flowStep: resolveFlowStep(searchState) }
          : searchResults.length
            ? { villaCount: searchResults.length, whatsappSent, flowStep: resolveFlowStep(searchState) }
            : { flowStep: resolveFlowStep(searchState) },
      },
    });

    return {
      conversationId: conversation.id,
      reply,
      shareUrl,
      whatsappSent,
    };
  }

  if (
    isAssistantMoreOptionsRequest(userText) &&
    resolveFlowStep(searchState) === "ready"
  ) {
    const phone =
      searchState.guestPhone?.trim() ||
      conversation.guestPhone?.trim() ||
      input.guestPhone?.trim();
    const finalized = await deliverAssistantOffers({
      searchState,
      phone,
      more: true,
    });

    await prisma.tatilAssistantConversation.update({
      where: { id: conversation.id },
      data: {
        guestName: persistedGuestName(
          finalized.searchState.guestName,
          conversation.guestName
        ),
        guestPhone: phone ?? conversation.guestPhone,
        searchState: finalized.searchState,
      },
    });

    await prisma.tatilAssistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: finalized.reply,
        metadata: {
          shareUrl: finalized.shareUrl,
          whatsappSent: finalized.whatsappSent,
          more: true,
          refreshed: finalized.refreshed,
          villaCount: finalized.searchResults.length,
        },
      },
    });

    return {
      conversationId: conversation.id,
      reply: finalized.reply,
      shareUrl: finalized.shareUrl,
      whatsappSent: finalized.whatsappSent,
    };
  }

  const phone =
    searchState.guestPhone?.trim() ||
    conversation.guestPhone?.trim() ||
    input.guestPhone?.trim();
  if (searchState.checkIn && searchState.adults && !isConversationGreeting(userText)) {
    const reply =
      "Tarih, kişi sayısı, bölge veya bir özellik yazarsanız seçenekleri ona göre güncellerim.";
    await prisma.tatilAssistantConversation.update({
      where: { id: conversation.id },
      data: {
        guestName: persistedGuestName(searchState.guestName, conversation.guestName),
        guestPhone: phone ?? conversation.guestPhone,
        searchState,
      },
    });
    await prisma.tatilAssistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: reply,
      },
    });
    if (phone) {
      try {
        await sendAssistantWhatsAppMessage(phone, reply);
      } catch {
        return { conversationId: conversation.id, reply, whatsappSent: false };
      }
    }
    return { conversationId: conversation.id, reply, whatsappSent: Boolean(phone) };
  }
  const intake = processFlowStep(userText, {
    guestName: searchState.guestName,
    guestPhone: phone,
    phoneCollected: Boolean(phone),
  });
  let reply = intake.handled
    ? intake.reply
    : buildConsultantOpening(searchState);
  let nextState = intake.handled
    ? intake.state
    : {
        guestName: searchState.guestName,
        guestPhone: phone,
        phoneCollected: Boolean(phone),
      };
  let whatsappSent = false;
  let shareUrl: string | undefined;
  if (intake.handled && intake.readyToSearch) {
    const finalized = await deliverAssistantOffers({
      searchState: nextState,
      phone,
      more: false,
    });
    nextState = finalized.searchState;
    reply = finalized.reply;
    shareUrl = finalized.shareUrl;
    whatsappSent = finalized.whatsappSent;
  }

  await prisma.tatilAssistantConversation.update({
    where: { id: conversation.id },
    data: {
      guestName: persistedGuestName(nextState.guestName, conversation.guestName),
      guestPhone: phone ?? conversation.guestPhone,
      searchState: nextState,
    },
  });

  await prisma.tatilAssistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: reply,
      metadata: shareUrl ? { shareUrl, whatsappSent } : { whatsappSent },
    },
  });

  return {
    conversationId: conversation.id,
    reply,
    shareUrl,
    whatsappSent,
  };
}
