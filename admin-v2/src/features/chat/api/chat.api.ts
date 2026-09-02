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
  cursor: ConversationCursor,
  search: string,
): Promise<CombinedConversationPage> {
  const suffix = search ? `&search=${encodeURIComponent(search)}` : "";
  const [directResult, groupResult] = await Promise.all([
    cursor.directDone
      ? Promise.resolve<ConversationPage>({ items: [], total: 0, totalUnread: 0, hasMore: false })
      : api.get<ConversationPage | ConversationPage["items"]>(
          `/admin/chat/conversations?limit=40&offset=${cursor.directOffset}${suffix}`,
        ),
    cursor.groupDone
      ? Promise.resolve<ConversationPage>({ items: [], total: 0, totalUnread: 0, hasMore: false })
      : api.get<ConversationPage>(
          `/chat/conversations?limit=40&offset=${cursor.groupOffset}${suffix}`,
        ),
  ]);
  const direct = Array.isArray(directResult)
    ? {
        items: directResult,
        total: directResult.length,
        totalUnread: directResult.reduce((sum, item) => sum + Number(item.unread || 0), 0),
        hasMore: false,
      }
    : directResult;
  const groups = groupResult.items ?? [];
  const directDone = cursor.directDone || !direct.hasMore;
  const groupDone = cursor.groupDone || !groupResult.hasMore;
  return {
    items: [...direct.items, ...groups],
    directTotal: cursor.directDone ? 0 : direct.total,
    groupTotal: cursor.groupDone ? 0 : groupResult.total,
    totalUnread:
      direct.totalUnread + groups.reduce((sum, item) => sum + Number(item.unread || 0), 0),
    next:
      directDone && groupDone
        ? undefined
        : {
            directOffset: cursor.directOffset + direct.items.length,
            groupOffset: cursor.groupOffset + groups.length,
            directDone,
            groupDone,
          },
  };
}

export function fetchMessages(conversationId: string, beforeMessageId = "") {
  return api.get<MessagePage>(
    `/chat/conversations/${conversationId}/messages?limit=50${beforeMessageId ? `&beforeMessageId=${encodeURIComponent(beforeMessageId)}` : ""}`,
  );
}

export const chatApi = {
  markRead: (conversationId: string) =>
    api.post(`/chat/conversations/${conversationId}/read`, {}),
  send: (conversationId: string, text: string, replyToId?: string) =>
    api.post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, { text, replyToId }),
  edit: (messageId: string, text: string) =>
    api.patch<ChatMessage>(`/chat/messages/${messageId}`, { text }),
  remove: (messageId: string) => api.delete(`/chat/messages/${messageId}`),
  react: (messageId: string, emoji: string) =>
    api.post(`/chat/messages/${messageId}/reactions`, { emoji }),
  removeReaction: (messageId: string, emoji: string) =>
    api.delete(`/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`),
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
