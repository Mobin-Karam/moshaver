import { api } from "../../../shared/api/api";
import type { ChatMessage } from "../../../shared/types/domain";
import type {
  CombinedConversationPage,
  ConversationCursor,
  ConversationPage,
  MessagePage,
} from "../model/chat.types";
import type { ChatUser, GroupDetail, GroupMember, GroupPermissions, GroupRole } from "../model/group.types";

export async function fetchConversationPage(
  _cursor: ConversationCursor,
  search: string,
): Promise<CombinedConversationPage> {
  const result = await api.get<ConversationPage | ConversationPage["items"]>("/chat/conversations");
  const all = Array.isArray(result) ? result : result.items;
  const normalized = all.filter((item) => !search || `${item.title || ""} ${item.student?.name || ""}`.toLowerCase().includes(search.toLowerCase()));
  const direct = normalized.filter((item) => item.type !== "group");
  const groups = normalized.filter((item) => item.type === "group");
  return {
    items: [...direct, ...groups],
    directTotal: direct.length,
    groupTotal: groups.length,
    totalUnread: normalized.reduce((sum, item) => sum + Number(item.unread || 0), 0),
    next: undefined,
  };
}

export async function fetchMessages(conversationId: string, beforeMessageId = "") {
  const result = await api.get<MessagePage | ChatMessage[]>(
    `/chat/conversations/${conversationId}/messages?limit=50${beforeMessageId ? `&beforeMessageId=${encodeURIComponent(beforeMessageId)}` : ""}`,
  );
  return Array.isArray(result) ? { messages: result, hasMore: false } : result;
}

export const chatApi = {
  markRead: (conversationId: string) =>
    api.post(`/chat/conversations/${conversationId}/read`, {}),
  send: (conversationId: string, text: string, replyToId?: string) =>
    api.post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, { text, replyToId }),
  edit: (conversationId: string, messageId: string, text: string) =>
    api.patch<ChatMessage>(`/chat/conversations/${conversationId}/messages/${messageId}`, { text }),
  remove: (conversationId: string, messageId: string) => api.delete(`/chat/conversations/${conversationId}/messages/${messageId}`),
  react: (conversationId: string, messageId: string, emoji: string) =>
    api.post(`/chat/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji }),
  group: (conversationId: string) =>
    api.get<GroupDetail>(`/chat/conversations/${conversationId}`),
  createGroup: (body: { title: string; description: string; memberIds: string[] }) =>
    api.post<GroupDetail>("/chat/groups", body),
  users: (search: string) =>
    api.get<ChatUser[]>(`/chat/users?limit=15&search=${encodeURIComponent(search)}`),
  members: (conversationId: string, search = "") =>
    api.get<GroupMember[]>(`/chat/groups/${conversationId}/members?limit=50${search ? `&search=${encodeURIComponent(search)}` : ""}`),
  candidates: (conversationId: string, search: string) =>
    api.get<ChatUser[]>(`/chat/groups/${conversationId}/candidates?limit=15&search=${encodeURIComponent(search)}`),
  addMember: (conversationId: string, userId: string) =>
    api.post(`/chat/groups/${conversationId}/members`, { userId }),
  removeMember: (conversationId: string, userId: string) =>
    api.delete(`/chat/groups/${conversationId}/members/${userId}`),
  changeRole: (conversationId: string, userId: string, role: GroupRole) =>
    api.patch(`/chat/groups/${conversationId}/members/${userId}`, { role }),
  transferOwner: (conversationId: string, userId: string) =>
    api.post(`/chat/groups/${conversationId}/transfer-owner`, { userId }),
  updateGroup: (conversationId: string, body: object) =>
    api.patch(`/chat/groups/${conversationId}`, body),
  updatePermissions: (conversationId: string, body: GroupPermissions) =>
    api.patch(`/chat/groups/${conversationId}/permissions`, body),
  mute: (conversationId: string, muted: boolean) =>
    api.patch(`/chat/conversations/${conversationId}/mute`, { muted }),
  leave: (conversationId: string) =>
    api.post(`/chat/groups/${conversationId}/leave`, {}),
};
