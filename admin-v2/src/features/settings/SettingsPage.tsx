import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, EmptyState } from "../../components/ui";
import { api, apiBaseUrl } from "../../services/api";

type Session = { id: string; current?: boolean; ipAddress?: string; userAgent?: string; lastSeenAt?: string };

export function SettingsPage() {
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => api.get<Session[]>("/auth/sessions") });
  const revoke = useMutation({ mutationFn: (id: string) => api.delete(`/auth/sessions/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }) });
  return <div className="grid gap-5"><div><h2 className="text-2xl font-black">تنظیمات</h2><p className="text-slate-500">نشست‌ها، API و سازگاری استقرار</p></div><Card><h3 className="mb-2 font-bold">API</h3><p className="text-sm text-slate-600" dir="ltr">{apiBaseUrl}</p></Card><Card><h3 className="mb-3 font-bold">نشست‌های فعال</h3>{sessions.data?.length ? <div className="grid gap-2">{sessions.data.map((s) => <div key={s.id} className="flex items-center justify-between rounded-md border p-3"><div><strong>{s.current ? "نشست فعلی" : "نشست فعال"}</strong><p className="text-xs text-slate-500">{s.ipAddress || "IP نامشخص"} - {(s.userAgent || "").slice(0, 80)}</p></div>{s.current ? <Badge>فعلی</Badge> : <Button variant="danger" onClick={() => revoke.mutate(s.id)}>بستن</Button>}</div>)}</div> : <EmptyState title="نشستی پیدا نشد." />}</Card></div>;
}
