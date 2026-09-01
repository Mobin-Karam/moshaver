import { useQuery } from "@tanstack/react-query";
import { Bell, BellRing, CheckCheck, MessageSquare, RefreshCw, Settings2, Volume2, VolumeX } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, EmptyState } from "../../shared/ui/ui";
import { StudentPicker } from "../../shared/ui/StudentPicker";
import { useLocale } from "../../shared/ui/locale";
import { useModal } from "../../shared/ui/modal";
import { useStudents } from "../../shared/hooks/useStudents";
import { api } from "../../shared/api/api";
import { notify } from "../../shared/ui/notifications";
import { useAdminNotifications } from "./NotificationProvider";
import { notificationAdminUrl, notificationTone, notificationTypeLabel, type PushPreferences, type PushStatus } from "./notification-model";

export function NotificationsPage() {
  const students = useStudents(), notifications = useAdminNotifications(), { formatDateTime } = useLocale(), modal = useModal(), navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const inbox = useQuery({ queryKey: ["inbox", students.studentId], enabled: !!students.studentId, queryFn: () => api.get<Record<string, unknown[]>>(`/admin/advisor-inbox?studentId=${encodeURIComponent(students.studentId)}`) });
  const items = useMemo(() => notifications.items.filter((item) => filter === "all" || !item.isRead), [filter, notifications.items]);
  const rows = [
    ...(inbox.data?.missedTasks ?? []).map((value) => ({ type: "فعالیت انجام‌نشده", value, tone: "red" as const })),
    ...(inbox.data?.reviews ?? []).map((value) => ({ type: "مرور", value, tone: "amber" as const })),
    ...(inbox.data?.recoveryRequests ?? []).map((value) => ({ type: "درخواست ریکاوری", value, tone: "blue" as const })),
    ...(inbox.data?.examRetryRequests ?? []).map((value) => ({ type: "تلاش مجدد", value, tone: "amber" as const })),
    ...(inbox.data?.issues ?? []).map((value) => ({ type: "هشدار", value, tone: "red" as const })),
  ];
  return <div className="grid gap-4">
    <Card className="flex flex-wrap items-center gap-2 p-3 sm:gap-3 sm:p-4">
      <div className="flex min-w-44 flex-1 items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-rose-50 text-rose-700"><BellRing size={21} /></span><div><strong className="block text-lg">{notifications.unread.toLocaleString("fa-IR")}</strong><span className="text-xs text-slate-500">اعلان خوانده‌نشده</span></div></div>
      <ToggleButton active={notifications.soundEnabled} onClick={() => { const enabled = !notifications.soundEnabled; notifications.setSoundEnabled(enabled); if (enabled) notifications.testSound(false); }} icon={notifications.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />} label="صدای اعلان" />
      <ToggleButton active={notifications.chatSoundEnabled} onClick={() => { const enabled = !notifications.chatSoundEnabled; notifications.setChatSoundEnabled(enabled); if (enabled) notifications.testSound(true); }} icon={<MessageSquare size={16} />} label="صدای پیام" />
      <Button variant="soft" onClick={() => modal.open({ title: "اعلان سیستمی و صدا", size: "lg", content: <NotificationSettings /> })}><Settings2 size={16} /> تنظیمات دستگاه</Button>
    </Card>
    <section className="grid min-h-0 gap-4 2xl:h-[calc(100dvh-13rem)] 2xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]">
      <Card className="flex min-h-[420px] flex-col overflow-hidden p-3 sm:p-4 2xl:min-h-0">
        <header className="mb-3 flex flex-wrap items-center gap-2"><Bell size={18} /><h3 className="font-bold">اعلان‌های مدیر</h3><div className="mr-auto flex rounded-md bg-slate-100 p-1"><button className={`rounded px-3 py-1 text-xs ${filter === "all" ? "bg-white font-bold text-brand shadow-sm" : "text-slate-500"}`} onClick={() => setFilter("all")}>همه</button><button className={`rounded px-3 py-1 text-xs ${filter === "unread" ? "bg-white font-bold text-brand shadow-sm" : "text-slate-500"}`} onClick={() => setFilter("unread")}>خوانده‌نشده <span className="mr-1 rounded-full bg-rose-600 px-1.5 text-white">{notifications.unread.toLocaleString("fa-IR")}</span></button></div>{notifications.unread ? <Button className="h-8 px-2 text-xs" variant="ghost" onClick={notifications.markAllRead}><CheckCheck size={15} /> خواندن همه</Button> : null}<Button className="h-8 px-2" variant="ghost" aria-label="تازه‌سازی" onClick={notifications.refresh}><RefreshCw size={15} /></Button></header>
        {notifications.loading ? <Skeletons /> : notifications.error ? <EmptyState title="دریافت اعلان‌ها ناموفق بود." action={<Button variant="soft" onClick={notifications.refresh}>تلاش دوباره</Button>} /> : items.length ? <div className="grid min-h-0 gap-2 overflow-y-auto pl-1">{items.map((item) => <button key={item.id} className={`rounded-lg border p-3 text-right transition hover:border-brand ${item.isRead ? "bg-white" : "border-teal-200 bg-teal-50/70"}`} onClick={() => { if (!item.isRead) notifications.markRead(item.id); navigate(notificationAdminUrl(item.url)); }}><span className="flex flex-wrap items-center gap-2"><strong className="min-w-0 flex-1">{item.title}</strong><Badge tone={notificationTone(item.type)}>{notificationTypeLabel(item.type)}</Badge>{!item.isRead ? <span className="size-2 rounded-full bg-rose-600" aria-label="خوانده‌نشده" /> : null}</span><p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p><small className="text-slate-400">{formatDateTime(item.createdAt)}</small></button>)}{notifications.hasMore ? <Button variant="soft" loading={notifications.loadingMore} onClick={notifications.loadMore}>نمایش اعلان‌های بیشتر</Button> : null}</div> : <EmptyState title={filter === "unread" ? "همه اعلان‌ها خوانده شده‌اند." : "اعلانی وجود ندارد."} />}
      </Card>
      <Card className="flex min-h-[340px] flex-col overflow-hidden p-3 sm:p-4 2xl:min-h-0">
        <header className="mb-3"><div className="flex items-center justify-between gap-2"><h3 className="font-bold">صندوق پیگیری</h3><Badge tone={rows.length ? "red" : "green"}>{rows.length.toLocaleString("fa-IR")}</Badge></div><div className="mt-3"><StudentPicker students={students.students} value={students.studentId} onChange={students.setStudentId} /></div></header>
        {inbox.isLoading ? <Skeletons /> : inbox.isError ? <EmptyState title="صندوق پیگیری دریافت نشد." action={<Button variant="soft" onClick={() => void inbox.refetch()}>تلاش دوباره</Button>} /> : rows.length ? <div className="grid gap-2 overflow-y-auto">{rows.map((row, index) => <div key={index} className="rounded-lg border p-3"><span className="flex items-center justify-between gap-2"><strong className="text-sm">{row.type}</strong><Badge tone={row.tone}>{(index + 1).toLocaleString("fa-IR")}</Badge></span><p className="mt-1 text-xs leading-5 text-slate-500">{summarize(row.value)}</p></div>)}</div> : <EmptyState title="مورد فعالی وجود ندارد." />}
      </Card>
    </section>
  </div>;
}

function NotificationSettings() {
  const notifications = useAdminNotifications();
  const [status, setStatus] = useState<PushStatus | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState("");
  useEffect(() => { void notifications.pushStatus().then(setStatus).catch(() => null).finally(() => setLoading(false)); }, []);
  async function action(name: string, work: () => Promise<PushStatus | void>) { setBusy(name); try { const next = await work(); if (next) setStatus(next); notify("تنظیمات اعلان ذخیره شد."); } catch (error) { notify(error instanceof Error ? error.message : "عملیات اعلان ناموفق بود.", "error"); } finally { setBusy(""); } }
  if (loading) return <div className="h-48 animate-pulse rounded-lg bg-slate-100" />;
  const message = !status?.supported ? "این مرورگر Push را پشتیبانی نمی‌کند." : !status.serverConfigured ? "کلیدهای Web Push روی سرور تنظیم نشده‌اند." : status.permission === "denied" ? "اجازه اعلان در تنظیمات مرورگر مسدود شده است." : status.registered ? "اعلان سیستمی این دستگاه فعال است." : "برای دریافت اعلان در پس‌زمینه، دستگاه را فعال کنید.";
  return <div className="grid gap-4"><div className={`rounded-lg p-3 text-sm ${status?.registered ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{message}</div><div className="flex flex-wrap gap-2">{status?.registered ? <Button variant="danger" loading={busy === "disable"} onClick={() => void action("disable", notifications.disablePush)}>غیرفعال‌کردن Push</Button> : <Button loading={busy === "enable"} disabled={!status?.supported || !status.serverConfigured} onClick={() => void action("enable", notifications.enablePush)}>فعال‌کردن اعلان سیستمی</Button>}<Button variant="soft" disabled={!status?.registered} loading={busy === "test"} onClick={() => void action("test", async () => { await notifications.testPush(); })}>ارسال اعلان آزمایشی</Button><Button variant="ghost" onClick={() => notifications.testSound(false)}>آزمایش صدا</Button></div><div className="grid gap-2 sm:grid-cols-2"><Preference label="پیام‌ها" name="messages" status={status} save={notifications.savePushPreferences} setStatus={setStatus} /><Preference label="آزمون‌ها" name="exams" status={status} save={notifications.savePushPreferences} setStatus={setStatus} /><Preference label="برنامه و درس" name="lessons" status={status} save={notifications.savePushPreferences} setStatus={setStatus} /><Preference label="اطلاعیه‌ها" name="announcements" status={status} save={notifications.savePushPreferences} setStatus={setStatus} /></div></div>;
}
function Preference({ label, name, status, save, setStatus }: { label: string; name: keyof PushPreferences; status: PushStatus | null; save: (value: PushPreferences) => Promise<void>; setStatus: (value: PushStatus) => void }) { const enabled = status?.preferences[name] !== false; return <label className="flex items-center justify-between rounded-md border p-3 text-sm"><span>{label}</span><input type="checkbox" checked={enabled} onChange={(event) => { if (!status) return; const preferences = { ...status.preferences, [name]: event.target.checked }; setStatus({ ...status, preferences }); void save(preferences).catch(() => setStatus(status)); }} /></label>; }
function ToggleButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) { return <button type="button" role="switch" aria-checked={active} onClick={onClick} className={`flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>{icon}{label}<span className={`size-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`} /></button>; }
function Skeletons() { return <div className="grid gap-2">{[1,2,3].map((item) => <div key={item} className="h-20 animate-pulse rounded-lg bg-slate-100" />)}</div>; }
function summarize(value: unknown) { if (!value || typeof value !== "object") return String(value || ""); const row = value as Record<string, unknown>; return String(row.title || row.subject || row.reason || row.message || row.createdAt || row.created_at || "جزئیات در داشبورد دانش‌آموز"); }
