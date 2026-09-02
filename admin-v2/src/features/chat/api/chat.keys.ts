export const chatKeys = {
  all: ["chat"] as const,
  conversations: (search = "") => ["chat-conversations", search] as const,
  messages: (conversationId?: string) =>
    ["chat-messages", conversationId] as const,
  group: (conversationId?: string) => ["chat-group", conversationId] as const,
  members: (conversationId: string, search = "") =>
    ["chat-group-members", conversationId, search] as const,
  candidates: (conversationId: string, search = "") =>
    ["chat-group-candidates", conversationId, search] as const,
  users: (search = "") => ["chat-users", search] as const,
};
