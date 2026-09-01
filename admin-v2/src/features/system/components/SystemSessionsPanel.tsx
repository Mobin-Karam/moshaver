import { Badge, Card, EmptyState } from "../../../shared/ui/ui";
import type { Session } from "../model/system.types";
export function SystemSessionsPanel({ sessions = [] }: { sessions?: Session[] }) { return <Card><h3 className="mb-3 font-bold">نشست‌های فعال</h3>{sessions.length ? <div className="grid gap-2">{sessions.map((s) => <div key={s.id} className="flex justify-between rounded-md border p-3 text-sm"><span>{s.current ? "نشست فعلی" : s.userAgent || "نشست"}</span><Badge>{s.current ? "فعلی" : s.ipAddress || "فعال"}</Badge></div>)}</div> : <EmptyState title="نشستی پیدا نشد." />}</Card>; }
