import { PrismaClient } from "@prisma/client";
import { toProperCaseName } from "./text-case";

/**
 * Ad Soyad alanları — hangi ekran/aksiyon üzerinden yazılırsa yazılsın
 * (panel, dış import script'i, otomatik senkron) veritabanına her zaman
 * "İlk Harf Büyük Kalanı Küçük" biçiminde kaydedilsin diye model bazlı
 * alan listesi. Yeni bir "Ad Soyad" alanı eklenirse buraya eklenmesi
 * yeterlidir; ayrıca her create/update noktasını tek tek değiştirmeye
 * gerek kalmaz.
 */
const NAME_FIELD_NORMALIZERS: Record<
  string,
  (record: Record<string, unknown>) => void
> = {
  Booking: (record) => {
    applyNameField(record, "guestName");
  },
  Villa: (record) => {
    applyNameField(record, "greeterName");
    applyNameField(record, "calendarManagerName");
  },
  VillaOwner: (record) => {
    applyNameField(record, "firstName");
    applyNameField(record, "lastName");
    applyNameField(record, "authorizedPersonName");
    // "name" tüzel kişilerde şirket ünvanıdır (companyTitle); onun
    // yazım biçimine dokunulmaz. Gerçek kişilerde ad soyad olduğu için
    // normalize edilir.
    if (record.type !== "TUZEL_KISI") {
      applyNameField(record, "name");
    }
  },
};

const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
]);

function applyNameField(record: Record<string, unknown>, field: string) {
  const value = record[field];
  if (typeof value === "string") {
    record[field] = toProperCaseName(value);
    return;
  }
  if (value && typeof value === "object" && "set" in (value as object)) {
    const wrapper = value as { set?: unknown };
    if (typeof wrapper.set === "string") {
      wrapper.set = toProperCaseName(wrapper.set);
    }
  }
}

function normalizeRecord(model: string, record: unknown) {
  const normalizer = NAME_FIELD_NORMALIZERS[model];
  if (!normalizer || !record || typeof record !== "object") return;
  normalizer(record as Record<string, unknown>);
}

function normalizeWriteArgs(model: string | undefined, args: unknown) {
  if (!model || !NAME_FIELD_NORMALIZERS[model]) return;
  if (!args || typeof args !== "object") return;

  const typedArgs = args as {
    data?: unknown;
    create?: unknown;
    update?: unknown;
  };

  if (typedArgs.create !== undefined || typedArgs.update !== undefined) {
    normalizeRecord(model, typedArgs.create);
    normalizeRecord(model, typedArgs.update);
    return;
  }

  const data = typedArgs.data;
  if (Array.isArray(data)) {
    data.forEach((item) => normalizeRecord(model, item));
    return;
  }
  normalizeRecord(model, data);
}

function withNameCasing(client: PrismaClient): PrismaClient {
  // Extension'ın döndürdüğü tip (DynamicClientExtensionThis) yapısal olarak
  // PrismaClient ile aynı model API'sine sahiptir; $transaction / dış
  // fonksiyon imzalarında (Prisma.TransactionClient, PrismaClient) tip
  // uyumluluğunu korumak için PrismaClient olarak dışa veriyoruz.
  // Extension davranışı (name-casing) çalışma zamanında aynen uygulanır,
  // $transaction içindeki tx nesnesine de otomatik yansır.
  return client.$extends({
    name: "person-name-casing",
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (WRITE_OPERATIONS.has(operation)) {
            normalizeWriteArgs(model, args);
          }
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  withNameCasing(
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    })
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
