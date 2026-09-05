import { describe, expect, it } from "vitest";
import {
  getHttpStatus,
  notificationRequestErrorMessage,
  shouldRetryNotificationRequest,
} from "./lib/api-error";

describe("notification api errors", () => {
  it("reads axios-like response status", () => {
    expect(getHttpStatus({ response: { status: 403 } })).toBe(403);
  });

  it("does not retry forbidden requests", () => {
    expect(shouldRetryNotificationRequest(0, { response: { status: 403 } })).toBe(false);
  });

  it("returns an access message for forbidden responses", () => {
    expect(notificationRequestErrorMessage({ status: 403 })).toContain("اجازه دسترسی");
  });
});
