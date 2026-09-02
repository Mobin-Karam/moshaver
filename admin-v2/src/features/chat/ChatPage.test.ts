import { describe, expect, it } from "vitest";
import { canUseMessageAction, chatSearchMatch, mergeMessagePages, sortConversations, type MessagePage } from "./ChatPage";
import type { GroupDetail } from "./chat-model";

describe("chat helpers", () => {
  it("matches normalized Persian names and last messages", () => {
    expect(chatSearchMatch({ id: "1", student: { id: "s", name: "علي" } }, "علی")).toBe(true);
    expect(chatSearchMatch({ id: "1", lastMessage: { text: "آزمون فردا" } }, "فردا")).toBe(true);
    expect(chatSearchMatch({ id: "g", type: "group", title: "مرور رياضي" }, "ریاضی")).toBe(true);
  });

  it("merges cursor pages chronologically without duplicates", () => {
    const latest: MessagePage = { messages: [{ id: "2", text: "دو", senderRole: "admin" }, { id: "3", text: "سه", senderRole: "student" }] };
    const older: MessagePage = { messages: [{ id: "1", text: "یک", senderRole: "student" }, { id: "2", text: "دو", senderRole: "admin" }] };
    expect(mergeMessagePages({ pages: [latest, older], pageParams: ["", "2"] }).map((item) => item.id)).toEqual(["1", "2", "3"]);
  });

  it("sorts direct and group conversations together by latest activity", () => {
    expect(sortConversations([
      { id: "direct", type: "direct", lastMessage: { createdAt: "2026-01-01T10:00:00Z" } },
      { id: "group", type: "group", lastMessage: { createdAt: "2026-01-02T10:00:00Z" } },
    ]).map((item) => item.id)).toEqual(["group", "direct"]);
  });

  it("hides group actions disabled by member permissions", () => {
    const group = { myRole: "member", permissions: { members_can_react: 0, members_can_edit_own_messages: 0, members_can_delete_own_messages: 0 } } as unknown as GroupDetail;
    expect(canUseMessageAction("react", true, group)).toBe(false);
    expect(canUseMessageAction("edit", true, group)).toBe(false);
    expect(canUseMessageAction("delete", true, group)).toBe(false);
    expect(canUseMessageAction("delete", false, group)).toBe(false);
  });
});
