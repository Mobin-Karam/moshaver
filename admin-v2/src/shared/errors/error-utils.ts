import { isRouteErrorResponse } from "react-router-dom";
import { ApiError } from "../api/api";

export type AppErrorKind = "unauthorized" | "forbidden" | "network" | "chunk" | "unknown";

export type AppErrorDetails = {
  kind: AppErrorKind;
  status?: number;
  title: string;
  description: string;
};

export function classifyAppError(error: unknown): AppErrorDetails {
  const status = errorStatus(error);
  const message = errorMessage(error).toLowerCase();

  if (status === 401) {
    return { kind: "unauthorized", status, title: "نشست شما پایان یافته است", description: "برای ادامه، دوباره وارد حساب خود شوید." };
  }
  if (status === 403) {
    return { kind: "forbidden", status, title: "دسترسی به این صفحه مجاز نیست", description: "نقش یا زمینه کاری فعال شما اجازه استفاده از این بخش را ندارد." };
  }
  if (/chunk|dynamically imported module|failed to fetch module/.test(message)) {
    return { kind: "chunk", status, title: "نسخه جدید صفحه آماده است", description: "بخشی از برنامه به‌روز شده است. صفحه را دوباره بارگذاری کنید." };
  }
  if (status === 0 || /network|fetch|offline|connection|abort/.test(message)) {
    return { kind: "network", status, title: "ارتباط با سرویس برقرار نشد", description: "اتصال خود را بررسی کنید و دوباره تلاش کنید." };
  }
  return { kind: "unknown", status, title: "مشکلی در بارگذاری صفحه رخ داد", description: "اطلاعات شما تغییری نکرده است. دوباره تلاش کنید یا به میز کار برگردید." };
}

function errorStatus(error: unknown) {
  if (error instanceof ApiError) return error.status;
  if (isRouteErrorResponse(error)) return error.status;
  if (error && typeof error === "object" && "status" in error && typeof error.status === "number") return error.status;
  return undefined;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (isRouteErrorResponse(error)) return String(error.data || error.statusText || "");
  return typeof error === "string" ? error : "";
}
