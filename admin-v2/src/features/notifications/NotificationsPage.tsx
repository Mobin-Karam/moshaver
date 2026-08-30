import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "../../components/ui";
import { StudentPicker } from "../../components/StudentPicker";
import { useStudents } from "../../hooks/useStudents";
import { api } from "../../services/api";

type Notification = { id: string; title: string; body?: string; isRead?: boolean; createdAt?: string };

export function NotificationsPage() {
  const students = useStudents(); const qc = useQueryClient();
  const inbox = useQuery({ queryKey: ["inbox", students.studentId], enabled: !!students.studentId, queryFn: () => api.get<Record<string, unknown[]>>(`/admin/advisor-inbox?studentId=${students.studentId}`) });
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: () => api.get<{ items: Notification[]; hasMore?: boolean }>("/notifications?limit=50") });
  const read = useMutation({ mutationFn: (id: string) => api.put(`/notifications/${id}/read`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
  const readAll = useMutation({ mutationFn: () => api.put("/notifications/read-all", {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
  const rows = [
    ...(inbox.data?.missedTasks ?? []).map((x) => ({ type: "فعالیت انجام‌نشده", x })),
    ...(inbox.data?.reviews ?? []).map((x) => ({ type: "مرور", x })),
    ...(inbox.data?.recoveryRequests ?? []).map((x) => ({ type: "درخواست ریکاوری", x })),
    ...(inbox.data?.examRetryRequests ?? []).map((x) => ({ type: "درخواست تلاش مجدد", x })),
    ...(inbox.data?.issues ?? []).map((x) => ({ type: "هشدار دانش‌آموز", x })),
  ];
  return <div className="grid gap-5"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 className="text-2xl font-black">مرکز اعلان‌ها</h2><p className="text-slate-500">اعلان‌های پایدار مدیر و صندوق پیگیری دانش‌آموز</p></div><div className="w-full md:w-72"><StudentPicker students={students.students} value={students.studentId} onChange={students.setStudentId} /></div></div>
    <Card><div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 font-bold"><Bell size={18} />اعلان‌های مدیر</h3><Button variant="soft" disabled={readAll.isPending} onClick={() => readAll.mutate()}><CheckCheck size={16} />خواندن همه</Button></div>{notifications.data?.items.length ? <div className="grid gap-2">{notifications.data.items.map((item) => <button key={item.id} className={`rounded-md border p-3 text-right ${item.isRead ? "bg-white" : "border-teal-200 bg-teal-50"}`} onClick={() => !item.isRead && read.mutate(item.id)}><span className="flex items-center justify-between"><strong>{item.title}</strong>{item.isRead ? null : <Badge tone="blue">جدید</Badge>}</span><p className="mt-1 text-sm text-slate-600">{item.body}</p><small className="text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString("fa-IR") : ""}</small></button>)}</div> : <EmptyState title="اعلانی وجود ندارد." />}</Card>
    <Card><h3 className="mb-3 font-bold">صندوق پیگیری دانش‌آموز</h3>{rows.length ? <div className="grid gap-2">{rows.map((row, index) => <div key={index} className="rounded-md border p-3"><strong>{row.type}</strong><p className="mt-1 text-xs text-slate-500">{summarize(row.x)}</p></div>)}</div> : <EmptyState title="مورد فعالی وجود ندارد." />}</Card>
  </div>;
}

function summarize(value: unknown) { if (!value || typeof value !== "object") return String(value || ""); const row = value as Record<string, unknown>; return String(row.title || row.subject || row.reason || row.message || row.createdAt || row.created_at || "جزئیات در داشبورد دانش‌آموز"); }
