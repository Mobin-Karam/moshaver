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
  UsersRound,
} from "lucide-react";

export const adminNavigation = [
  { section: "خانه", items: [{ path: "", title: "داشبورد", description: "نمای کلی امروز، سلامت سیستم و موارد نیازمند توجه", icon: LayoutDashboard }] },
  { section: "آموزش", items: [
    { path: "planner", title: "برنامه‌ریز", description: "مدیریت برنامه روزانه، هفتگی و وظایف دانش‌آموز", icon: CalendarDays },
    { path: "exams", title: "آزمون‌ها", description: "زمان‌بندی، انتشار، تلاش مجدد، بودجه و سؤال‌ها", icon: BookOpenCheck },
    { path: "questions", title: "بانک سؤال", description: "ساخت، بازبینی و مرتب‌سازی سؤال‌های هر آزمون", icon: GraduationCap },
    { path: "quizzes", title: "آزمونک‌ها", description: "مدیریت آزمونک‌ها، سؤال‌ها و وضعیت انتشار", icon: BookOpenCheck },
    { path: "subjects", title: "درس‌ها", description: "مدیریت درس‌ها و شناسه‌های آموزشی", icon: BookOpen },
  ] },
  { section: "ارتباط", items: [
    { path: "live", title: "فعالیت زنده", description: "پایش وضعیت و فعالیت جاری همه دانش‌آموزان", icon: Activity },
    { path: "chat", title: "گفتگو", description: "پیام‌های مستقیم و گروهی، حضور و پیگیری گفتگوها", icon: MessageSquare },
    { path: "notifications", title: "مرکز اعلان‌ها", description: "ارسال و پیگیری اعلان‌های دانش‌آموزان", icon: Bell },
  ] },
  { section: "مدیریت", items: [
    { path: "students", title: "دانش‌آموزان", description: "مدیریت حساب، وضعیت و دسترسی دانش‌آموزان", icon: UsersRound },
    { path: "reports", title: "گزارش‌ها", description: "گزارش عملکرد، مطالعه و روند پیشرفت دانش‌آموز", icon: LayoutDashboard },
  ] },
  { section: "سامانه", items: [
    { path: "system", title: "سیستم و امنیت", description: "پشتیبان‌گیری، سلامت سرویس و رویدادهای امنیتی", icon: Database },
    { path: "settings", title: "تنظیمات", description: "موقعیت، تقویم، نشست‌ها و اتصال API", icon: Settings },
  ] },
] as const;

export const flatAdminNavigation = adminNavigation.flatMap((group) => group.items.map((item) => ({ ...item, section: group.section })));
export const mainAdminNavigation = adminNavigation.map((group) => ({
  ...group.items[0],
  title: group.section,
  section: group.section,
}));
