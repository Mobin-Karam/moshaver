import type { NotificationContract } from "@moshaver/api-contract";

export type AdminNotification = Partial<NotificationContract> & Pick<NotificationContract, "id" | "title">;

export type NotificationPage = {
  items: AdminNotification[];
  unreadCount?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
};

export type PushPreferences = {
  lessons: boolean;
  messages: boolean;
  exams: boolean;
  announcements: boolean;
};

export type PushStatus = {
  supported: boolean;
  permission:
    | NotificationPermission
    | "unsupported";
  registered: boolean;
  serverConfigured: boolean;
  preferences: PushPreferences;
};

export function notificationTone(
  type?: string,
) {
  if (type === "message") {
    return "blue" as const;
  }

  if (type === "exam") {
    return "amber" as const;
  }

  if (type === "lesson") {
    return "green" as const;
  }

  return "neutral" as const;
}

export function notificationTypeLabel(
  type?: string,
) {
  return (
    {
      message: "پیام",
      exam: "آزمون",
      lesson: "برنامه",
      announcement: "اطلاعیه",
    } as Record<string, string>
  )[type || ""] || "اعلان";
}

export function notificationAdminUrl(
  url?: string,
) {
  if (!url || url === "/") {
    return "/admin/notifications";
  }

  if (url.startsWith("/admin/")) {
    return url;
  }

  if (
    url.startsWith("/chat") ||
    url.startsWith("/messages")
  ) {
    return "/admin/chat";
  }

  if (url.startsWith("/exams")) {
    return "/admin/exams";
  }

  if (
    url.startsWith("/schedule") ||
    url.startsWith("/plans")
  ) {
    return "/admin/planner";
  }

  return "/admin/notifications";
}
