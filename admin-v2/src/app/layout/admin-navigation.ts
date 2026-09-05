import {
  Activity,
  Bell,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  Database,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Sparkles,
  UsersRound,
  Building2,
} from "lucide-react";

export const adminNavigation = [
  { section: "خانه", items: [{ path: "", title: "داشبورد", description: "نمای کلی امروز، سلامت سیستم و موارد نیازمند توجه", icon: LayoutDashboard }] },
  { section: "آموزش", items: [
    { path: "planner", title: "برنامه‌ریز", description: "مدیریت برنامه روزانه، هفتگی و وظایف دانش‌آموز", icon: CalendarDays, capability:"plans.read" },
    { path: "learning", title: "سیستم یادگیری", description: "مدیریت مرورهای فاصله‌دار، تسلط و الگوهای خطای دانش‌آموز", icon: Sparkles, capability:"students.read", aliases: ["education", "students/:studentId/learning"] },
    { path: "exams", title: "آزمون‌ها", description: "زمان‌بندی، انتشار، تلاش مجدد، بودجه و سؤال‌ها", icon: BookOpenCheck, capability:"exams.read" },
    { path: "questions", title: "بانک سؤال", description: "ساخت، بازبینی و مرتب‌سازی سؤال‌های هر آزمون", icon: GraduationCap, capability:"questions.read" },
    { path: "quizzes", title: "آزمونک‌ها", description: "مدیریت آزمونک‌ها، سؤال‌ها و وضعیت انتشار", icon: BookOpenCheck, capability:"quizzes.read" },
    { path: "subjects", title: "درس‌ها", description: "مدیریت درس‌ها و شناسه‌های آموزشی", icon: BookOpen, capability:"subjects.read" },
  ] },
  { section: "ارتباط", items: [
    { path: "live", title: "فعالیت زنده", description: "پایش وضعیت و فعالیت جاری همه دانش‌آموزان", icon: Activity, capability:"student.live.read" },
    { path: "chat", title: "گفتگو", description: "پیام‌های مستقیم و گروهی، حضور و پیگیری گفتگوها", icon: MessageSquare, capability:"chat.read" },
    { path: "notifications", title: "مرکز اعلان‌ها", description: "ارسال و پیگیری اعلان‌های دانش‌آموزان", icon: Bell },
  ] },
  { section: "مدیریت", items: [
    { path: "students", title: "دانش‌آموزان", description: "مدیریت حساب، وضعیت و دسترسی دانش‌آموزان", icon: UsersRound, capability:"students.read" },
    { path: "users", title: "کاربران و کارکنان", description: "مدیریت حساب‌ها، نقش‌ها و عضویت‌های سازمان", icon: UsersRound, capability:"users.read" },
    { path: "organizations", title: "سازمان‌ها", description: "مدیریت سازمان‌ها و زمینه فعال", icon: Building2, capability:"organization.read" },
    { path: "reports", title: "گزارش‌ها", description: "گزارش عملکرد، مطالعه و روند پیشرفت دانش‌آموز", icon: LayoutDashboard, capability:"reports.read" },
  ] },
  { section: "سامانه", items: [
    { path: "system", title: "سیستم و امنیت", description: "پشتیبان‌گیری، سلامت سرویس و رویدادهای امنیتی", icon: Database, capability:"database.read" },
    { path: "settings", title: "تنظیمات", description: "موقعیت، تقویم، نشست‌ها و اتصال API", icon: Settings },
  ] },
] as const;

export const flatAdminNavigation = adminNavigation.flatMap((group) => group.items.map((item) => ({ ...item, section: group.section })));
export const mainAdminNavigation = adminNavigation.map((group) => ({
  ...group.items[0],
  title: group.section,
  section: group.section,
}));

export function navigationForCapabilities(capabilities: readonly string[]) {
  return adminNavigation.map((group) => ({ ...group, items: group.items.filter((item) => !("capability" in item) || capabilities.includes(item.capability)) })).filter((group) => group.items.length);
}

export function normalizeAdminPath(pathname: string) {
  return pathname.replace(/^https?:\/\/[^/]+/i, "").split(/[?#]/)[0].replace(/^\/admin\/?/, "").replace(/^\/+|\/+$/g, "");
}

function routeMatches(pattern: string, path: string) {
  const expected = pattern.split("/").filter(Boolean);
  const actual = path.split("/").filter(Boolean);
  if (!expected.length) return !actual.length;
  if (actual.length < expected.length) return false;
  return expected.every((part, index) => part.startsWith(":") || part === actual[index]);
}

export function resolveAdminNavigation(pathname: string) {
  const path = normalizeAdminPath(pathname);
  return flatAdminNavigation.find((item) => routeMatches(item.path, path) || ("aliases" in item && item.aliases.some((alias) => routeMatches(alias, path)))) || flatAdminNavigation[0];
}

export function adminDestination(path: string, section: string, studentId = "") {
  const base = path ? `/admin/${path}` : "/admin";
  return section === "آموزش" && studentId
    ? `${base}?studentId=${encodeURIComponent(studentId)}`
    : base;
}

export function adminBreadcrumbs(path: string) {
  const current = resolveAdminNavigation(path);
  if (!current.path) return [{ title: "خانه", path: "" }];

  const group = adminNavigation.find((item) => item.section === current.section);
  const sectionPath = group?.items[0].path || current.path;

  // The first destination in a section is already its landing page. Showing
  // both the section and page as separate breadcrumb links would produce two
  // adjacent crumbs pointing to the same URL.
  if (current.path === sectionPath) {
    return [
      { title: "خانه", path: "" },
      { title: current.section, path: current.path },
    ];
  }

  return [
    { title: "خانه", path: "" },
    { title: current.section, path: sectionPath },
    { title: current.title, path: current.path },
  ];
}
