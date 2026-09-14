export type EdmEnvironment = "test" | "production";

const TEST_ENDPOINT =
  "https://test.edmbilisim.com.tr/EFaturaEDM21ea/EFaturaEDM.svc";
const PRODUCTION_ENDPOINT =
  "https://portal2.edmbilisim.com.tr/EFaturaEDM/EFaturaEDM.svc";

/** EDM ortak test mükellefi (test kullanıcısı oturumu bu VKN'ye bağlı) */
export const EDM_TEST_SESSION_VKN = "3230512384";

/** EDM test ortamı varsayılan GİB gönderici birim (GB) etiketi */
export const EDM_TEST_DEFAULT_SENDER_ALIAS =
  "urn:mail:defaultgb@edmbilisim.com.tr";

export const EDM_TEST_DEFAULT_SUPPLIER_TITLE =
  "EDM BİLİŞİM SİSTEMLERİ VE DANIŞMANLIK HİZMETLERİ A.Ş.";

export type EdmConfig = {
  enabled: boolean;
  environment: EdmEnvironment;
  endpoint: string;
  username: string;
  password: string;
  /** Gönderici VKN — testte oturum firması; canlıda şirket VKN */
  senderVkn: string;
  senderAlias: string;
  /** UBL satıcı ünvanı (boşsa CompanySettings) */
  supplierTitle: string;
  applicationName: string;
  channelName: string;
  hostname: string;
  invoiceSerial: string;
  supplierCity: string;
  supplierDistrict: string;
  dryRun: boolean;
};

function envBool(value: string | undefined, fallback = false) {
  if (value == null || value.trim() === "") return fallback;
  return /^(1|true|yes|on)$/i.test(value.trim());
}

export function getEdmConfig(): EdmConfig {
  const environment: EdmEnvironment =
    process.env.EDM_ENV?.trim().toLowerCase() === "production"
      ? "production"
      : "test";

  const endpointOverride = process.env.EDM_ENDPOINT?.trim();
  const endpoint =
    endpointOverride ||
    (environment === "production" ? PRODUCTION_ENDPOINT : TEST_ENDPOINT);

  const configuredAlias = process.env.EDM_SENDER_ALIAS?.trim() || "";
  const senderAlias =
    configuredAlias ||
    (environment === "test" ? EDM_TEST_DEFAULT_SENDER_ALIAS : "");

  const configuredVkn = (process.env.EDM_SENDER_VKN || "").replace(/\D/g, "");
  const senderVkn =
    configuredVkn ||
    (environment === "test" ? EDM_TEST_SESSION_VKN : "");

  return {
    enabled: envBool(process.env.EDM_ENABLED, false),
    environment,
    endpoint,
    username: process.env.EDM_USERNAME?.trim() || "",
    password: process.env.EDM_PASSWORD?.trim() || "",
    senderVkn,
    senderAlias,
    supplierTitle: process.env.EDM_SUPPLIER_TITLE?.trim() || "",
    applicationName:
      process.env.EDM_APPLICATION_NAME?.trim() || "Tatildeyiz Admin v1.0",
    channelName: process.env.EDM_CHANNEL_NAME?.trim() || "TATILDEYIZ",
    hostname: process.env.EDM_HOSTNAME?.trim() || "tatildeyiz-app",
    invoiceSerial: process.env.EDM_INVOICE_SERIAL?.trim() || "",
    supplierCity: process.env.EDM_SUPPLIER_CITY?.trim() || "MUĞLA",
    supplierDistrict: process.env.EDM_SUPPLIER_DISTRICT?.trim() || "SEYDIKEMER",
    dryRun: envBool(process.env.EDM_DRY_RUN, false),
  };
}

export function assertEdmConfigured(config: EdmConfig = getEdmConfig()) {
  if (!config.enabled) {
    throw new Error("EDM entegrasyonu kapalı (EDM_ENABLED=true gerekli).");
  }
  if (!config.username || !config.password) {
    throw new Error("EDM_USERNAME / EDM_PASSWORD tanımlı değil.");
  }
  return config;
}

/** Gönderimde kullanılacak satıcı VKN + ünvan */
export function resolveEdmSupplierIdentity(
  config: EdmConfig,
  company: { taxNumber: string; companyTitle: string; agencyName: string }
) {
  const companyTax = company.taxNumber.replace(/\D/g, "");
  const senderVkn = config.senderVkn || companyTax;
  const usingTestSessionVkn =
    config.environment === "test" && senderVkn === EDM_TEST_SESSION_VKN;

  const title =
    config.supplierTitle ||
    (usingTestSessionVkn
      ? EDM_TEST_DEFAULT_SUPPLIER_TITLE
      : company.companyTitle || company.agencyName);

  return { senderVkn, title, companyTax };
}
