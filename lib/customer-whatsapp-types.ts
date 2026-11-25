export const CUSTOMER_WHATSAPP_LINE_LABEL = "0252 618 01 08";

export type InboxChannel =
  | "whatsapp"
  | "messenger"
  | "instagram"
  | "facebook-comments"
  | "instagram-comments"
  | "facebook-lead";

export type CustomerWhatsappChat = {
  id: string;
  channel?: InboxChannel;
  title: string;
  phoneDigits: string;
  preview: string;
  fromMe: boolean;
  timestamp: number;
  unreadCount: number;
  customerId: string | null;
  customerName: string | null;
  permalink?: string;
};

export type CustomerWhatsappMessage = {
  id: string;
  text: string;
  fromMe: boolean;
  timestamp: number;
  media: boolean;
};

export type CustomerWhatsappChatPage = {
  chats: CustomerWhatsappChat[];
  hasMore: boolean;
  nextOffset: number;
  lineLabel: string;
  connectedName: string | null;
  error: string | null;
};

export type CustomerWhatsappThread = {
  chatId: string;
  messages: CustomerWhatsappMessage[];
  error: string | null;
};
