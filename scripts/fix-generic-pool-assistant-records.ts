import { prisma } from "../lib/db";
import { GENERIC_POOL_REQUEST } from "../lib/villa-pool-amenities";

const CHILD_POOL_NAMES = new Set([
  "çocuk havuzu",
  "çocuk havuzlu villalar",
]);

function fold(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function askedChildPool(text: string) {
  return /çocuk\s*havuz|cocuk\s*havuz/iu.test(text);
}

function askedBarePool(text: string) {
  const lower = text.toLocaleLowerCase("tr-TR");
  if (askedChildPool(lower)) return false;
  if (
    /özel\s*havuz|ozel\s*havuz|kapal[ıi]\s*havuz|ortak\s*havuz|is[ıi]tmal[ıi]\s*havuz|havuzlu|infinity|sonsuzluk|korunakl[ıi]\s*havuz/iu.test(
      lower
    )
  ) {
    return false;
  }
  return /(?:^|[^a-zçğıöşü0-9])havuz(?:u)?(?:[^a-zçğıöşü0-9]|$)/iu.test(lower);
}

function isChildPoolName(name: string) {
  return CHILD_POOL_NAMES.has(fold(name));
}

async function main() {
  const conversations = await prisma.tatilAssistantConversation.findMany({
    select: {
      id: true,
      guestName: true,
      searchState: true,
      messages: {
        select: { id: true, role: true, content: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  let updated = 0;
  for (const conversation of conversations) {
    const state = (conversation.searchState ?? {}) as {
      amenityNames?: string[];
    };
    const names = state.amenityNames ?? [];
    if (!names.some(isChildPoolName)) continue;

    const userTexts = conversation.messages
      .filter((message) => message.role === "user")
      .map((message) => message.content);
    if (userTexts.some(askedChildPool)) continue;
    if (!userTexts.some(askedBarePool)) continue;

    const nextNames = [
      ...new Set(
        names.map((name) => (isChildPoolName(name) ? GENERIC_POOL_REQUEST : name))
      ),
    ];
    await prisma.tatilAssistantConversation.update({
      where: { id: conversation.id },
      data: {
        searchState: {
          ...(state as object),
          amenityNames: nextNames,
        },
      },
    });
    updated += 1;
    console.log(
      `${conversation.id} ${conversation.guestName ?? ""} ${names.join(", ")} -> ${nextNames.join(", ")}`
    );
  }

  let messagesUpdated = 0;
  for (const conversation of conversations) {
    let barePoolActive = false;
    for (const message of conversation.messages) {
      if (message.role === "user") {
        if (askedChildPool(message.content)) barePoolActive = false;
        else if (
          /özel\s*havuz|ozel\s*havuz|kapal[ıi]\s*havuz|ortak\s*havuz|is[ıi]tmal[ıi]\s*havuz|havuzlu/iu.test(
            message.content
          )
        ) {
          barePoolActive = false;
        } else if (askedBarePool(message.content)) barePoolActive = true;
        else if (/^(selam|merhaba|merhabalar|selamlar)$/iu.test(message.content.trim())) {
          barePoolActive = false;
        }
        continue;
      }
      if (!barePoolActive || message.role !== "assistant") continue;
      if (!/çocuk havuzlu/iu.test(message.content)) continue;
      const content = message.content.replace(/çocuk havuzlu/giu, "havuzlu");
      if (content === message.content) continue;
      await prisma.tatilAssistantMessage.update({
        where: { id: message.id },
        data: { content },
      });
      messagesUpdated += 1;
    }
  }

  console.log(`guncellenen arama: ${updated}`);
  console.log(`guncellenen mesaj: ${messagesUpdated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
