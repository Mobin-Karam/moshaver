import type { ChatMessage } from '../types.js';

export function appendMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (messages.some((item) => item.id === message.id)) return messages;
  return [...messages, message].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function unreadCount(messages: ChatMessage[], currentUserId: string): number {
  return messages.filter((message) => message.senderUserId !== currentUserId && !message.seen).length;
}
