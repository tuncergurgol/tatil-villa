import { findCustomerByPhone } from "@/lib/customer-crm";
import { isActiveLoyaltyMemberPhone } from "@/lib/queries/customer-lookup";
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
  ASSISTANT_EMPTY_SEARCH_MESSAGE,
  ASSISTANT_FIRST_OPTION_COUNT,
  ASSISTANT_MAX_MORE_ROUNDS,
  ASSISTANT_MORE_OPTION_COUNT,
  ASSISTANT_REFRESH_CRITERIA_MESSAGE,
  ASSISTANT_UPDATE_HINT_MESSAGE,
  buildAssistantLookingMessage,
  formatAssistantVillaOfferMessage,
  isAssistantMoreOptionsRequest,
  pricedAssistantVillas,
} from "@/lib/tatil-assistant-format";
import { missingRegionPriceReply } from "@/lib/tatil-assistant-price-gap";
import { createAssistantPublicShareLink } from "@/lib/tatil-assistant-share";
import { sendAssistantWhatsAppMessage } from "@/lib/tatil-assistant-whatsapp";
import { isGenericPoolRequestName } from "@/lib/villa-pool-amenities";
import {
  applyCriterionUpdate,
  assistantPartySizeWindow,
  assistantPlaceName,
  omitCalendarMonthAmenities,
  partyCapacity,
  rememberRegionTrail,
  buildConsultantOpening,
  isConversationGreeting,
  usablePersonName,
  buildFlowReply,
  extractGuestPhone,
  processFlowStep,
  resolveFlowStep,
  setAssistantFeatureCatalog,
  setAssistantRegionCatalog,
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

async function loadAssistantRegionCatalog() {
  return prisma.region.findMany({
    where: { active: true },
    select: { id: true, parentId: true, level: true, name: true, slug: true },
  });
}

async function loadAssistantFeatureCatalog() {
  const [amenities, categories] = await Promise.all([
    prisma.amenity.findMany({ where: { active: true }, select: { name: true } }),
    prisma.facilityCategory.findMany({
      where: { published: true },
      select: { name: true },
    }),
  ]);
  return [...amenities, ...categories].map((item) => item.name);
}

async function expandAssistantFeatures(names: string[] | undefined) {
  if (!names?.length) {
    return {
      amenityNames: undefined as string[] | undefined,
      facilityCategoryNames: undefined as string[] | undefined,
      anyPool: false,
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
  let anyPool = false;
  const exactName = (rows: { name: string }[], needle: string) => {
    const folded = needle.toLocaleLowerCase("tr-TR");
    return rows.find((item) => item.name.toLocaleLowerCase("tr-TR") === folded);
  };
  for (const name of names) {
    if (isGenericPoolRequestName(name)) {
      anyPool = true;
      continue;
    }
    const amenityExact = exactName(amenities, name);
    const categoryExact = exactName(categories, name);
    if (amenityExact) amenityNames.push(amenityExact.name);
    else if (categoryExact) facilityCategoryNames.push(categoryExact.name);
    else {
      const amenity = matchFeatureName(amenities, name);
      const category = matchFeatureName(categories, name);
      if (amenity) amenityNames.push(amenity.name);
      else if (category) facilityCategoryNames.push(category.name);
      else amenityNames.push(name);
    }
  }
  return {
    amenityNames: amenityNames.length ? [...new Set(amenityNames)] : undefined,
    facilityCategoryNames: facilityCategoryNames.length
      ? [...new Set(facilityCategoryNames)]
      : undefined,
    anyPool,
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
  includeUndocumented?: boolean;
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
    anyPool: features.anyPool,
    guestCounts: args.guestCounts ?? (args.adults > 0 ? [args.adults] : []),
    flexibleDate: args.flexibleDate ?? false,
    fillEmptyDates: true,
    sort: "price_asc",
    requireDocument: true,
    includeUndocumented: args.includeUndocumented ?? false,
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

async function describeAssistantSearch(state: AssistantSearchState) {
  const multipleRegions = (state.regionSlugs?.length ?? 0) > 1;
  const remembered = multipleRegions ? "" : assistantPlaceName(state);
  let regionNames: string[] = remembered ? [remembered] : [];
  if (!remembered && !state.regionAny && state.regionSlugs?.length) {
    const regions = await prisma.region.findMany({
      where: { slug: { in: state.regionSlugs } },
      select: { name: true, slug: true },
    });
    regionNames = state.regionSlugs.map((slug) => {
      const found = regions.find((region) => region.slug === slug);
      if (found?.name) return found.name;
      return slug
        .split("-")
        .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
        .join(" ");
    });
  }
  return buildAssistantLookingMessage({
    regionNames,
    regionAny: state.regionAny,
    amenityNames: omitCalendarMonthAmenities(state.amenityNames),
  });
}

async function deliverAssistantOffers(input: {
  searchState: AssistantSearchState;
  phone?: string;
  more: boolean;
}) {
  const phone = input.phone;
  const more = input.more;
  const cleanedAmenities = omitCalendarMonthAmenities(input.searchState.amenityNames);
  const searchState: AssistantSearchState =
    cleanedAmenities.length === (input.searchState.amenityNames ?? []).length
      ? input.searchState
      : { ...input.searchState, amenityNames: cleanedAmenities };
  const domain = TATILDEYIZ_PUBLIC_DOMAIN;

  if (
    !searchState.checkIn ||
    !searchState.checkOut ||
    (partyCapacity(searchState) <= 0 && !searchState.guestsAny)
  ) {
    return {
      reply: "Aramaya geçebilmem için birkaç bilgiye daha ihtiyacım var.",
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

  const capacity = partyCapacity(searchState);
  const partySizes = searchState.guestsAny
    ? []
    : assistantPartySizeWindow(
        searchState.partySizes?.length
          ? searchState.partySizes
          : capacity > 0
            ? [capacity]
            : []
      );
  const regionSlugs = searchState.regionAny ? undefined : searchState.regionSlugs;

  const sent = new Set(searchState.sentVillaIds ?? []);
  const limit = more ? ASSISTANT_MORE_OPTION_COUNT : ASSISTANT_FIRST_OPTION_COUNT;
  const includeUndocumented = phone
    ? await isActiveLoyaltyMemberPhone(phone)
    : false;
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
      includeUndocumented,
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
      includeUndocumented,
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
    const looking = await describeAssistantSearch(searchState);
    const missingPrice = keepCriteria ? await missingRegionPriceReply(searchState) : "";
    const follow = missingPrice || ASSISTANT_EMPTY_SEARCH_MESSAGE;
    const reply = keepCriteria
      ? `${looking}\n\n${follow}`
      : refreshCriteriaReply(searchState);
    let whatsappSent = false;
    if (phone) {
      const outbound = keepCriteria ? [looking, follow] : [reply];
      for (const text of outbound) {
        try {
          await sendAssistantWhatsAppMessage(phone, text);
          whatsappSent = true;
        } catch {
          break;
        }
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
          `${missingSizes.join(" ve ")} kişilik bir villa bu kriterlerde çıkmadı. Uygun olan diğer seçenekleri iletiyorum.`,
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
  const looking = await describeAssistantSearch(searchState);
  const reply = [looking, ...messages].join("\n\n");
  const deliveredIds: string[] = [];
  if (phone) {
    const prefaceCount = 1 + (missingSizes.length ? 1 : 0);
    const villaMessages = missingSizes.length ? messages.slice(1) : messages;
    const outbound = [looking, ...(missingSizes.length ? [messages[0]!] : []), ...villaMessages];
    for (const [index, text] of outbound.entries()) {
      try {
        await sendAssistantWhatsAppMessage(phone, text);
        if (index >= prefaceCount) {
          deliveredIds.push(offerBatch[index - prefaceCount]!.id);
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
  const [featureCatalog, regionCatalog] = await Promise.all([
    loadAssistantFeatureCatalog(),
    loadAssistantRegionCatalog(),
  ]);
  setAssistantFeatureCatalog(featureCatalog);
  setAssistantRegionCatalog(regionCatalog);
  searchState = rememberRegionTrail(searchState);
  const priorUserTexts = conversation.messages
    .filter((message) => message.role === "user")
    .map((message) => message.content);
  const history = input.reuseLastUserMessage
    ? priorUserTexts.slice(0, -1)
    : priorUserTexts;
  const confirmationOpen = Boolean(
    searchState.pendingConfirm || searchState.confirmQueue?.length
  );
  if (
    !confirmationOpen &&
    !searchState.freshIntake &&
    !searchState.regionAny &&
    !searchState.guestsAny &&
    (!searchState.checkIn || partyCapacity(searchState) <= 0 || !searchState.regionSlugs?.length)
  ) {
    let rebuilt: AssistantSearchState = {
      guestName: searchState.guestName,
      guestPhone: searchState.guestPhone || input.guestPhone || undefined,
      phoneCollected: Boolean(searchState.guestPhone || input.guestPhone),
      helpAsked: true,
    };
    for (const text of history) rebuilt = applyCriterionUpdate(rebuilt, text);
    if (rebuilt.checkIn || partyCapacity(rebuilt) > 0 || rebuilt.regionSlugs?.length) {
      const kept = Object.fromEntries(
        Object.entries(searchState).filter(([, value]) => value !== undefined)
      ) as AssistantSearchState;
      searchState = {
        ...rebuilt,
        ...kept,
        guestName: searchState.guestName ?? rebuilt.guestName,
        guestPhone: searchState.guestPhone || rebuilt.guestPhone,
        phoneCollected: true,
        helpAsked: true,
      };
    }
  }
  const previousUserText = history.length ? history[history.length - 1] : undefined;
  let flowAdvance = processFlowStep(userText, searchState, previousUserText);
  setAssistantFeatureCatalog([]);
  setAssistantRegionCatalog([]);

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
  if (searchState.checkIn && (partyCapacity(searchState) > 0 || searchState.guestsAny) && !isConversationGreeting(userText)) {
    const reply =
      ASSISTANT_UPDATE_HINT_MESSAGE;
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
  setAssistantFeatureCatalog(featureCatalog);
  setAssistantRegionCatalog(regionCatalog);
  const intake = processFlowStep(userText, {
    guestName: searchState.guestName,
    guestPhone: phone,
    phoneCollected: Boolean(phone),
  });
  setAssistantFeatureCatalog([]);
  setAssistantRegionCatalog([]);
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
