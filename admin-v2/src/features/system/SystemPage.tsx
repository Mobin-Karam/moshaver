import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Download, KeyRound, Upload } from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Textarea,
} from "../../shared/ui/ui";
import { api } from "../../shared/api/api";
import { useModal } from "../../shared/ui/modal";

type DatabaseMeta = {
  status?: string;
  database?: string;
  version?: string;
  environment?: string;
  uptimeSeconds?: number;
  activeSessions?: number;
  realtimeConnections?: number;
  sizeBytes?: number;
};
type Session = {
  id: string;
  current?: boolean;
  ipAddress?: string;
  userAgent?: string;
  lastSeenAt?: string;
};

export function SystemPage() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [release, setRelease] = useState({
    app: "admin",
    version: "",
    notes: "",
  });
  const modal = useModal();
  const database = useQuery({
    queryKey: ["system-database"],
    queryFn: () => api.get<DatabaseMeta>("/admin/system/database"),
  });
  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.get<Session[]>("/auth/sessions"),
  });
  const imports = useQuery({
    queryKey: ["import-history"],
    queryFn: () => api.get<Record<string, unknown>[]>("/admin/import/history"),
  });
  const releases = useQuery({
    queryKey: ["app-releases"],
    queryFn: () => api.get<Record<string, unknown>[]>("/admin/app-releases"),
  });
  const audit = useQuery({
    queryKey: ["audit"],
    queryFn: () => api.get<Record<string, unknown>[]>("/admin/audit"),
  });
  const restore = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("فایل انتخاب نشده است.");
      return api.uploadBinary("/admin/system/database-restore", file);
    },
  });
  const changePassword = useMutation({
    mutationFn: () => api.post("/auth/change-password", passwords),
    onSuccess: () => setPasswords({ currentPassword: "", newPassword: "" }),
  });
  const saveRelease = useMutation({
    mutationFn: () =>
      api.put(`/admin/app-releases/${encodeURIComponent(release.app)}`, {
        version: release.version,
        notes: release.notes,
      }),
    onSuccess: () => {
      setRelease({ ...release, version: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["app-releases"] });
    },
  });
  async function download() {
    const result = await api.download("/admin/system/database-backup");
    const url = URL.createObjectURL(result.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  const meta = database.data;
  return (
    <div className="grid gap-5">
      <section className="grid gap-3 md:grid-cols-4">
        <Metric
          label="پایگاه داده"
          value={meta?.database || meta?.status || "-"}
        />
        <Metric label="نسخه" value={meta?.version || "-"} />
        <Metric label="نشست فعال" value={String(meta?.activeSessions || 0)} />
        <Metric
          label="اتصال زنده"
          value={String(meta?.realtimeConnections || 0)}
        />
      </section>
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Database size={18} />
          <h3 className="font-bold">پشتیبان SQLite</h3>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Button onClick={() => void download()}>
            <Download size={16} />
            دانلود پشتیبان
          </Button>
          <Field label="فایل بازیابی">
            <Input
              type="file"
              accept=".sqlite,.db,application/vnd.sqlite3"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Field>
          <Button
            loading={restore.isPending}
            variant="danger"
            disabled={!file || restore.isPending}
            onClick={() =>
              void modal
                .confirm({
                  title: "بازیابی پایگاه داده؟",
                  description:
                    "پایگاه داده فعلی جایگزین و سرویس بک‌اند دوباره راه‌اندازی می‌شود. این عملیات پرخطر است.",
                  tone: "danger",
                  confirmLabel: "بازیابی",
                })
                .then((confirmed) => confirmed && restore.mutate())
            }
          >
            <Upload size={16} />
            بازیابی
          </Button>
        </div>
      </Card>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-bold">امنیت حساب</h3>
          <div className="grid gap-3">
            <Field label="رمز فعلی">
              <Input
                type="password"
                value={passwords.currentPassword}
                onChange={(e) =>
                  setPasswords({
                    ...passwords,
                    currentPassword: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="رمز جدید">
              <Input
                type="password"
                value={passwords.newPassword}
                onChange={(e) =>
                  setPasswords({ ...passwords, newPassword: e.target.value })
                }
              />
            </Field>
            <Button
              loading={changePassword.isPending}
              disabled={
                passwords.newPassword.length < 8 || changePassword.isPending
              }
              onClick={() =>
                void modal
                  .confirm({
                    title: "تغییر رمز مدیر؟",
                    description:
                      "پس از تغییر رمز، نشست‌های دیگر این حساب بسته می‌شوند.",
                    confirmLabel: "تغییر رمز",
                  })
                  .then((confirmed) => confirmed && changePassword.mutate())
              }
            >
              <KeyRound size={16} />
              تغییر رمز
            </Button>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 font-bold">نشست‌های فعال</h3>
          {sessions.data?.length ? (
            <div className="grid gap-2">
              {sessions.data.map((s) => (
                <div
                  key={s.id}
                  className="flex justify-between rounded-md border p-3 text-sm"
                >
                  <span>{s.current ? "نشست فعلی" : s.userAgent || "نشست"}</span>
                  <Badge>{s.current ? "فعلی" : s.ipAddress || "فعال"}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="نشستی پیدا نشد." />
          )}
        </Card>
      </section>
      <Card>
        <h3 className="mb-3 font-bold">انتشار نسخه</h3>
        <div className="grid gap-3 md:grid-cols-[160px_180px_1fr_auto]">
          <Field label="برنامه">
            <Input
              dir="ltr"
              value={release.app}
              onChange={(e) => setRelease({ ...release, app: e.target.value })}
            />
          </Field>
          <Field label="نسخه">
            <Input
              dir="ltr"
              value={release.version}
              onChange={(e) =>
                setRelease({ ...release, version: e.target.value })
              }
            />
          </Field>
          <Field label="یادداشت انتشار">
            <Textarea
              rows={1}
              value={release.notes}
              onChange={(e) =>
                setRelease({ ...release, notes: e.target.value })
              }
            />
          </Field>
          <Button
            loading={saveRelease.isPending}
            className="md:mt-6"
            disabled={!release.app || !release.version || saveRelease.isPending}
            onClick={() =>
              void modal
                .confirm({
                  title: "ثبت انتشار جدید؟",
                  description: `${release.app} • ${release.version}`,
                  confirmLabel: "ثبت انتشار",
                })
                .then((confirmed) => confirmed && saveRelease.mutate())
            }
          >
            ثبت انتشار
          </Button>
        </div>
      </Card>
      <History title="تاریخچه انتشار" rows={releases.data} />
      <History title="تاریخچه ورود JSON" rows={imports.data} />
      <History title="گزارش ممیزی" rows={audit.data} />
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <span className="text-xs text-slate-500">{label}</span>
      <strong className="mt-2 block text-lg">{value}</strong>
    </Card>
  );
}
function History({
  title,
  rows = [],
}: {
  title: string;
  rows?: Record<string, unknown>[];
}) {
  return (
    <Card>
      <h3 className="mb-3 font-bold">{title}</h3>
      {rows.length ? (
        <div className="grid max-h-80 gap-2 overflow-auto">
          {rows.map((row, index) => (
            <article
              key={String(row.id || index)}
              className="rounded-md border p-3 text-sm"
            >
              <strong>
                {String(
                  row.app_name ||
                    row.action ||
                    row.type ||
                    row.created_at ||
                    "رکورد",
                )}
              </strong>
              <p className="mt-1 text-xs text-slate-500">
                {String(
                  row.version ||
                    row.notes ||
                    row.message ||
                    row.created_at ||
                    row.updated_at ||
                    "",
                )}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="سابقه‌ای وجود ندارد." />
      )}
    </Card>
  );
}
