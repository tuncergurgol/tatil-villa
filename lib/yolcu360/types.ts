export type Yolcu360Environment = "staging" | "production";

export type Yolcu360Money = {
  amount: number;
  currency: string;
};

export type Yolcu360AuthResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpireAt: string;
  refreshTokenExpireAt: string;
};

export type Yolcu360LocationSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types?: string[];
};

export type Yolcu360LocationDetail = {
  placeId: string;
  name: string;
  city?: string;
  countryCode?: string;
  timezone?: string;
  point: { lat: number; lon: number };
};

export type Yolcu360SearchPointRequest = {
  checkInDateTime: string;
  checkOutDateTime: string;
  age: string;
  country: string;
  paymentType: "creditCard" | "limit";
  checkInLocation: { lat: number; lon: number };
  checkOutLocation: { lat: number; lon: number };
  commission?: { type: "percentage"; percentage: number };
  campaignCode?: string;
  fullCredit?: boolean;
};

export type Yolcu360CarResult = {
  code: string;
  searchID: string;
  isFindeksRequired?: boolean;
  integrationCode?: string;
  applicableForFullCredit?: boolean;
  brand?: { id?: number; name?: string };
  model?: { id?: number; name?: string };
  class?: { id?: number; name?: string };
  transmission?: { id?: number; name?: string };
  fuel?: { id?: number; name?: string };
  seatCount?: number;
  rentalDurationInDays?: number;
  imageURL?: string;
  pricing?: {
    net?: Yolcu360Money;
    commission?: Yolcu360Money;
    total?: Yolcu360Money;
    paymentTotal?: Yolcu360Money;
  };
  vendor?: { id?: number; displayName?: string; name?: string };
  rules?: Array<{ type?: string; value?: string | number }>;
  appointment?: {
    checkInDateTime?: string;
    checkOutDateTime?: string;
    checkInOffice?: { name?: string; address?: string };
    checkOutOffice?: { name?: string; address?: string };
  };
};

export type Yolcu360SearchResponse = {
  count: number;
  results: Yolcu360CarResult[];
};

export type Yolcu360ExtraProduct = {
  code: string;
  name: string;
  type: string;
  searchID: string;
  min?: number;
  max?: number;
  pricing?: {
    total?: Yolcu360Money;
    net?: Yolcu360Money;
    commission?: Yolcu360Money;
  };
};

export type Yolcu360PassengerInput = {
  firstName: string;
  lastName: string;
  email: string;
  nationality: string;
  phone: string;
  birthDate: string;
  identityNumber?: string;
  passportNo?: string;
};

export type Yolcu360CreateOrderRequest = {
  paymentType: "creditCard" | "limit";
  searchID: string;
  code: string;
  extraProducts?: Array<{ code: string; quantity: number }>;
  passenger: Yolcu360PassengerInput;
  billing?: Record<string, unknown>;
  isFullCredit?: boolean;
  isLimitedCredit?: boolean;
  trackingID?: string;
};

export type Yolcu360Order = {
  id: string;
  paymentType?: string;
  paymentCurrency?: string;
  passenger?: Yolcu360PassengerInput & Record<string, unknown>;
  orderedCarProduct?: {
    id?: number;
    status?: string;
    vendorReservationID?: string;
    paymentID?: number;
    car?: Yolcu360CarResult;
  };
  orderedExtraProducts?: Array<{
    id?: number;
    status?: string;
    extraProduct?: Yolcu360ExtraProduct;
  }>;
};

export type Yolcu360InstallmentInfo = {
  bankCode?: number;
  bankName?: string;
  cardAssociation?: string;
  shouldForceTo3D?: boolean;
  supportedCurrencies?: string[];
  installmentPrices?: Array<{
    number: number;
    price?: Yolcu360Money;
    totalPrice?: Yolcu360Money;
  }>;
};

export type Yolcu360PayRequest = {
  orderID: string;
  paymentType: "creditCard" | "limit";
  payWithCard?: {
    cardNumber: string;
    expireMonth: string;
    expireYear: string;
    cardHolderName: string;
    cvc: string;
    installment: number;
    isWith3DSecure: boolean;
    callbackUrl: string;
  };
};

export type Yolcu360PayResponse = {
  status: "success" | "redirect_required" | "failed";
  is3dsSecure?: boolean;
  threeDSHtmlContent?: string;
};

export type Yolcu360ApiErrorPayload = {
  code?: number;
  description?: string;
  details?: unknown;
};

export type Yolcu360FindeksStatus =
  | "Positive"
  | "Negative"
  | "Unknown"
  | "Positive With Young Driver";
