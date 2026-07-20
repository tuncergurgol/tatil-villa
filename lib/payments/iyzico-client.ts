import { createIyzicoAuthorizationHeader } from "@/lib/payments/iyzico-auth";

export type IyzicoConfig = {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
};

export type IyzicoCfInitializeInput = {
  locale?: "tr" | "en";
  conversationId: string;
  price: string;
  paidPrice: string;
  currency?: string;
  basketId: string;
  callbackUrl: string;
  enabledInstallments?: number[];
  buyer: {
    id: string;
    name: string;
    surname: string;
    identityNumber: string;
    email: string;
    gsmNumber: string;
    registrationAddress: string;
    city: string;
    country: string;
    ip?: string;
  };
  billingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
  };
  basketItems: Array<{
    id: string;
    name: string;
    category1: string;
    itemType: "VIRTUAL" | "PHYSICAL";
    price: string;
  }>;
};

export type IyzicoCfInitializeResult = {
  status: string;
  token?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  conversationId?: string;
};

export type IyzicoCfRetrieveResult = {
  status: string;
  paymentStatus?: string;
  paymentId?: string;
  paidPrice?: number;
  price?: number;
  fraudStatus?: number;
  conversationId?: string;
  token?: string;
  signature?: string;
  errorCode?: string;
  errorMessage?: string;
};

const CF_INITIALIZE_PATH =
  "/payment/iyzipos/checkoutform/initialize/auth/ecom";
const CF_RETRIEVE_PATH = "/payment/iyzipos/checkoutform/auth/ecom/detail";

export function resolveIyzicoBaseUrl(mode: string): string {
  return mode === "live"
    ? "https://api.iyzipay.com"
    : "https://sandbox-api.iyzipay.com";
}

async function iyzicoPost<T>(
  config: IyzicoConfig,
  uriPath: string,
  body: Record<string, unknown>
): Promise<T> {
  const requestBody = JSON.stringify(body);
  const authorization = createIyzicoAuthorizationHeader(
    config.apiKey,
    config.secretKey,
    uriPath,
    requestBody
  );

  const response = await fetch(`${config.baseUrl}${uriPath}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: requestBody,
    cache: "no-store",
  });

  const json = (await response.json()) as T;
  return json;
}

export async function iyzicoCheckoutFormInitialize(
  config: IyzicoConfig,
  input: IyzicoCfInitializeInput
): Promise<IyzicoCfInitializeResult> {
  return iyzicoPost<IyzicoCfInitializeResult>(config, CF_INITIALIZE_PATH, {
    locale: input.locale ?? "tr",
    conversationId: input.conversationId,
    price: input.price,
    paidPrice: input.paidPrice,
    currency: input.currency ?? "TRY",
    basketId: input.basketId,
    paymentGroup: "PRODUCT",
    callbackUrl: input.callbackUrl,
    enabledInstallments: input.enabledInstallments ?? [1, 2, 3, 6, 9, 12],
    buyer: input.buyer,
    shippingAddress: input.billingAddress,
    billingAddress: input.billingAddress,
    basketItems: input.basketItems,
  });
}

export async function iyzicoCheckoutFormRetrieve(
  config: IyzicoConfig,
  token: string,
  conversationId?: string
): Promise<IyzicoCfRetrieveResult> {
  return iyzicoPost<IyzicoCfRetrieveResult>(config, CF_RETRIEVE_PATH, {
    locale: "tr",
    token,
    ...(conversationId ? { conversationId } : {}),
  });
}

export function formatIyzicoPrice(amount: number): string {
  const value = Math.max(0, Math.round(amount));
  return `${value}.00`;
}
