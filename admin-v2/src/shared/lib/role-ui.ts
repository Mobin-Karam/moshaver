import type { RoleCode } from "../types/domain";

export const roleLabels: Record<RoleCode, string> = {
  STUDENT: "دانش‌آموز",
  GUARDIAN: "سرپرست",
  ADVISOR: "مشاور",
  TEACHER: "دبیر",
  MENTOR: "منتور",
  CONTENT_MANAGER: "مدیر محتوا",
  ORGANIZATION_ADMIN: "مدیر سازمان",
  PLATFORM_ADMIN: "مدیر پلتفرم",
};
export const rolePortalTitles: Partial<Record<RoleCode, string>> = {
  GUARDIAN: "پرتال خانواده",
  ADVISOR: "پنل مشاور",
  TEACHER: "پنل دبیر",
  MENTOR: "پنل منتور",
  CONTENT_MANAGER: "استودیوی محتوا",
  ORGANIZATION_ADMIN: "پنل مدیریت سازمان",
  PLATFORM_ADMIN: "پنل مدیریت پلتفرم",
};
export const roleLabel = (role?: string | null) =>
  roleLabels[role as RoleCode] || "کاربر سامانه";
export const rolePortalTitle = (role?: string | null) =>
  rolePortalTitles[role as RoleCode] || "پرتال مشاور";
