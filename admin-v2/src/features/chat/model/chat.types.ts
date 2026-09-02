import type { ChatMessage, Conversation } from "../../../shared/types/domain";

export type ConversationFilter = "all" | "unread" | "direct" | "group" | "favorites" | "drafts" | "online";
export type ConversationSort = "recent" | "unread" | "online" | "name";
export type MessageAction = "edit" | "delete" | "react";

export type ConversationPage = {
  items: Conversation[];
  total: number;
  totalUnread: number;
  hasMore: boolean;
  nextOffset?: number;
};

export type ConversationCursor = {
  directOffset: number;
  groupOffset: number;
  directDone: boolean;
  groupDone: boolean;
};

export type CombinedConversationPage = {
  items: Conversation[];
  directTotal: number;
  groupTotal: number;
  totalUnread: number;
  next?: ConversationCursor;
};

export type MessagePage = {
  messages: ChatMessage[];
  hasMore?: boolean;
  nextBeforeMessageId?: string;
  unread?: number;
  otherReadAt?: string;
};
