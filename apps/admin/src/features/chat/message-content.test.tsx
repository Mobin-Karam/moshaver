import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { normalizeChatMessage } from "./api/chat.api";
import { MessageBody } from "./components/messages/MessageList";

describe("chat message content", () => {
  it("normalizes the backend uppercase TEXT contract and renders its text", () => {
    const message = normalizeChatMessage({
      id: "message-1",
      text: "متن پیام باید دیده شود",
      type: "TEXT",
      senderRole: "advisor",
    });

    render(<MessageBody message={message} />);

    expect(message.type).toBe("text");
    expect(screen.getByText("متن پیام باید دیده شود")).toBeInTheDocument();
  });

  it("accepts content from older responses and preserves it for structured messages", () => {
    const message = normalizeChatMessage({
      id: "message-2",
      content: "برنامه امروز برای شما ارسال شد",
      type: "PLAN",
      senderRole: "advisor",
    });

    render(<MessageBody message={message} />);

    expect(screen.getByText("برنامه امروز برای شما ارسال شد")).toBeInTheDocument();
    expect(screen.getByText("اشتراک دانش‌آموز")).toBeInTheDocument();
  });
});
