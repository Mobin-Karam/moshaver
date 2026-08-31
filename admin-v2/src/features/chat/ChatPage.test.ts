import { describe, expect, it } from "vitest";
import { chatSearchMatch, mergeMessagePages, type MessagePage } from "./ChatPage";

describe("chat helpers", () => {
  it("matches normalized Persian names and last messages", () => {
    expect(chatSearchMatch({ id: "1", student: { id: "s", name: "علي" } }, "علی")).toBe(true);
    expect(chatSearchMatch({ id: "1", lastMessage: { text: "آزمون فردا" } }, "فردا")).toBe(true);
  });

  it("merges cursor pages chronologically without duplicates", () => {
    const latest: MessagePage = { messages: [{ id: "2", text: "دو", senderRole: "admin" }, { id: "3", text: "سه", senderRole: "student" }] };
    const older: MessagePage = { messages: [{ id: "1", text: "یک", senderRole: "student" }, { id: "2", text: "دو", senderRole: "admin" }] };
    expect(mergeMessagePages({ pages: [latest, older], pageParams: ["", "2"] }).map((item) => item.id)).toEqual(["1", "2", "3"]);
  });
});
