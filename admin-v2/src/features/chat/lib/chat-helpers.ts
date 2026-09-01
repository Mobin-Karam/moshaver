import type { InfiniteData } from "@tanstack/react-query";
import { normalizePersianText } from "../../../shared/lib/utils";
import type { ChatMessage, Conversation } from "../../../shared/types/domain";
import type { MessagePage } from "../model/chat.types";
export { canUseMessageAction } from "../model/permissions";

export function chatSearchMatch(item: Conversation, search: string) {
  const needle = normalizePersianText(search).trim().toLocaleLowerCase("fa");
  if (!needle) return true;
  return normalizePersianText(
    `${item.student?.name || ""} ${item.student?.grade || ""} ${item.title || ""} ${item.description || ""} ${item.lastMessage?.text || ""}`,
  ).toLocaleLowerCase("fa").includes(needle);
}

export function mergeMessagePages(data?: InfiniteData<MessagePage>) {
  if (!data) return [];
  const seen = new Set<string>();
  return [...data.pages]
    .reverse()
    .flatMap((page) => page.messages)
    .filter((message) => {
      if (seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    });
}

export function sortConversations(items: Conversation[]) {
  return [...items].sort((a, b) => conversationActivity(b) - conversationActivity(a));
}

export function conversationActivity(item: Conversation) {
  return item.lastMessage?.createdAt ? new Date(item.lastMessage.createdAt).getTime() : 0;
}

export function isNearBottom(node: HTMLElement | null, threshold = 120) {
  return !!node && node.scrollHeight - node.scrollTop - node.clientHeight < threshold;
}

export function showDateSeparator(previous: ChatMessage | undefined, current: ChatMessage) {
  if (!previous?.createdAt || !current.createdAt) return true;
  return previous.createdAt.slice(0, 10) !== current.createdAt.slice(0, 10);
}

function draftKey(id: string) {
  return `admin-chat-draft:${id}`;
}

export function readDraft(id: string) {
  try { return sessionStorage.getItem(draftKey(id)) || ""; } catch { return ""; }
}

export function persistDraft(id: string | undefined, value: string) {
  if (!id) return;
  try {
    if (value.trim()) sessionStorage.setItem(draftKey(id), value);
    else sessionStorage.removeItem(draftKey(id));
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}
