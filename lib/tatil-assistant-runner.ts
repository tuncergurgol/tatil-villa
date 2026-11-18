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
  formatAssistantVillaOfferMessages,
  isAssistantMoreOptionsRequest,
  pricedAssistantVillas,
} from "@/lib/tatil-assistant-format";
import { createAssistantPublicShareLink } from "@/lib/tatil-assistant-share";
import { sendAssistantWhatsAppMessage } from "@/lib/tatil-assistant-whatsapp";
import {
  buildConsultantOpening,
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

async function expandAssistantAmenityNames(names: string[] | undefined) {
  if (!names?.length) return undefined;
  const amenities = await prisma.amenity.findMany({
    where: { active: true },
    select: { name: true },
  });
  const resolved: string[] = [];
  for (const name of names) {
    const needle = name.toLocaleLowerCase("tr-TR");
    const hit =
      amenities.find(
        (amenity) => amenity.name.toLocaleLowerCase("tr-TR") === needle
      ) ??
      amenities.find((amenity) => {
        const current = amenity.name.toLocaleLowerCase("tr-TR");
        return current.includes(needle) || needle.includes(current);
      });
    if (hit) resolved.push(hit.name);
  }
  const unique = [...new Set(resolved)];
  return unique.length ? unique : undefined;
}

async function runVillaSearch(args: {
  checkIn: string;
  checkOut: string;
  adults: number;
  regionSlugs?: string[];
  amenityNames?: string[];
  flexibleDate?: boolean;
}) {
  const [regionSlugs, amenityNames] = await Promise.all([
    expandAssistantRegionSlugs(args.regionSlugs),
    expandAssistantAmenityNames(args.amenityNames),
  ]);

  return searchAvailability({
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    adults: args.adults,
    children: 0,
    babies: 0,
    regionSlugs,
    amenityNames,
    flexibleDate: args.flexibleDate ?? true,
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

function refreshCriteriaReply(state: AssistantSearchState) {
  const name = state.guestName?.trim();
  const ask = name
    ? `${name}, hangi tarihlerde konaklamak istiyorsunuz?`
    : "Hangi tarihlerde konaklamak istiyorsunuz?";
  return `${ASSISTANT_REFRESH_CRITERIA_MESSAGE} ${ask}`;
}

async function deliverAssistantOffers(input: {
  searchState: AssistantSearchState;
  phone?: string;
  more: boolean;
}) {
  const { searchState, phone, more } = input;
  const domain = TATILDEYIZ_PUBLIC_DOMAIN;

  if (!searchState.checkIn || !searchState.checkOut || !searchState.adults) {
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

  const searchResults = await runVillaSearch({
    checkIn: searchState.checkIn,
    checkOut: searchState.checkOut,
    adults: searchState.adults,
    regionSlugs: searchState.regionSlugs,
    amenityNames: searchState.amenityNames,
    flexibleDate: true,
  });

  const sent = new Set(searchState.sentVillaIds ?? []);
  const limit = more ? ASSISTANT_MORE_OPTION_COUNT : ASSISTANT_FIRST_OPTION_COUNT;
  const batch = pricedAssistantVillas(searchResults)
    .filter((item) => !sent.has(item.id))
    .slice(0, limit);

  if (batch.length === 0) {
    const nextState = refreshCriteriaState(searchState);
    const reply = searchResults.length
      ? refreshCriteriaReply(searchState)
      : "Bu kriterlerle uygun villa bulamadım. Dilerseniz kriterleri yenileyip yeniden deneyelim. Hangi tarihlerde konaklamak istiyorsunuz?";
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
      searchResults,
      shareUrl: undefined,
      whatsappSent,
      refreshed: true,
    };
  }

  const shareUrl = await createAssistantPublicShareLink({
    villaIds: batch.map((item) => item.id),
    checkIn: searchState.checkIn,
    checkOut: searchState.checkOut,
    adults: searchState.adults,
    domain,
  });

  const messages = formatAssistantVillaOfferMessages(batch, {
    domain,
    guestName: searchState.guestName,
    adults: searchState.adults,
    brand: "Tatildeyiz",
  });
  const reply = messages.join("\n\n");
  const deliveredIds: string[] = [];
  if (phone) {
    for (const [index, text] of messages.entries()) {
      try {
        await sendAssistantWhatsAppMessage(phone, text);
        deliveredIds.push(batch[index]!.id);
      } catch {
        break;
      }
      if (index < messages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
    }
  }
  const whatsappSent = !phone || deliveredIds.length > 0;

  const nextState: AssistantSearchState = {
    ...searchState,
    sentVillaIds: [
      ...sent,
      ...(phone ? deliveredIds : batch.map((item) => item.id)),
    ],
    moreOptionRounds: more ? moreRounds + 1 : moreRounds,
  };

  return {
    reply,
    searchState: nextState,
    searchResults: batch,
    shareUrl,
    whatsappSent,
    refreshed: false,
  };
}

function usableCustomerName(name: string | null | undefined) {
  const trimmed = name?.trim() ?? "";
  if (trimmed.length < 2) return "";
  const folded = trimmed.toLocaleLowerCase("tr-TR");
  if (folded === "misafir" || folded === "müşteri" || folded === "musteri") {
    return "";
  }
  return trimmed;
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

  const sameText = (left: string, right: string) =>
    left.replace(/\s+/g, " ").trim() === right.replace(/\s+/g, " ").trim();
  const recentUser = [...conversation.messages]
    .reverse()
    .find((message) => message.role === "user");
  if (recentUser && sameText(recentUser.content, userText)) {
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

  await prisma.tatilAssistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: userText,
    },
  });

  let searchState = await applyKnownCustomerName(
    (conversation.searchState ?? {}) as AssistantSearchState,
    input.guestPhone || conversation.guestPhone
  );
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
        guestName: finalized.searchState.guestName ?? conversation.guestName,
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
  if (reply.includes("tam anlayamadım")) {
    reply = buildConsultantOpening(nextState);
  }

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
      guestName: nextState.guestName ?? conversation.guestName,
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
