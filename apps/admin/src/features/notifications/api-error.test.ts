import { describe, expect, it } from "vitest";
import {
  getHttpStatus,
  isAuthHttpError,
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

  it("reads direct, legacy and nested-cause status values", () => {
    expect(getHttpStatus({ status: "401" })).toBe(401);
    expect(getHttpStatus({ status: 0, statusCode: 404 })).toBe(404);
    expect(getHttpStatus({ cause: { response: { status: 503 } } })).toBe(503);
    expect(getHttpStatus(null)).toBeUndefined();
    expect(getHttpStatus({ status: 999 })).toBeUndefined();
  });

  it("classifies authentication failures", () => {
    expect(isAuthHttpError({ status: 401 })).toBe(true);
    expect(isAuthHttpError({ status: 403 })).toBe(true);
    expect(isAuthHttpError({ status: 500 })).toBe(false);
  });

  it("only retries transient failures twice", () => {
    for (const status of [400, 401, 403, 404]) expect(shouldRetryNotificationRequest(0, { status })).toBe(false);
    expect(shouldRetryNotificationRequest(0, { status: 500 })).toBe(true);
    expect(shouldRetryNotificationRequest(2, { status: 500 })).toBe(false);
  });

  it("returns actionable messages for common failures", () => {
    expect(notificationRequestErrorMessage({ status: 401 })).toContain("دوباره وارد");
    expect(notificationRequestErrorMessage({ status: 404 })).toContain("پیدا نشد");
    expect(notificationRequestErrorMessage({ status: 503 })).toContain("سرور اعلان‌ها");
    expect(notificationRequestErrorMessage({ status: 422 })).toContain("ناموفق");
  });
});
