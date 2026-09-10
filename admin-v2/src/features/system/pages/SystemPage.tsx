import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Database, FileClock, PackageOpen, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { useModal } from "../../../shared/ui/modal";
import { notify } from "../../../shared/ui/notifications";
import { Badge, Button, Card, EmptyState } from "../../../shared/ui/ui";
import {
  downloadDatabaseBackup,
  getAppVersions,
  getAudit,
  getDatabaseMeta,
  getImportHistory,
  getReadiness,
  getReleases,
  getServiceHealth,
  restoreDatabase,
  saveAppRelease,
  saveAppVersion,
} from "../api/system.api";
import { AppVersionManager } from "../components/AppVersionManager";
import { DatabaseBackupPanel } from "../components/DatabaseBackupPanel";
import { ReleasePanel } from "../components/ReleasePanel";
import { SystemHistory } from "../components/SystemHistory";
import { RelaxationMusicManager } from "../components/RelaxationMusicManager";

export type SystemView = "overview" | "releases" | "database" | "audit";
function QueryError({ retry }: { retry: () => void }) {
  return (
    <EmptyState
      title="دریافت اطلاعات ناموفق بود."
      action={
        <Button variant="soft" onClick={retry}>
          <RefreshCw size={15} />
          تلاش دوباره
        </Button>
      }
    />
  );
}

export function SystemPage({ view = "overview" }: { view?: SystemView }) {
  const auth = useAuth(),
    qc = useQueryClient(),
    modal = useModal();
  const [file, setFile] = useState<File | null>(null);
  const [release, setRelease] = useState({ app: "admin", version: "", notes: "" });
  const canReadDatabase = auth.can("database.read"),
    canReadReleases = auth.can("release.read"),
    canManageReleases = auth.can("release.manage"),
    canReadAudit = auth.can("audit.read"),
    canReadImports = auth.can("import.preview");
  const health = useQuery({
    queryKey: ["system-health"],
    queryFn: getServiceHealth,
    enabled: view === "overview",
  });
  const ready = useQuery({
    queryKey: ["system-ready"],
    queryFn: getReadiness,
    enabled: view === "overview",
  });
  const database = useQuery({
    queryKey: ["system-database"],
    queryFn: getDatabaseMeta,
    enabled: view === "database" && canReadDatabase,
  });
  const versions = useQuery({
    queryKey: ["app-versions"],
    queryFn: getAppVersions,
    enabled: view === "releases" && canReadReleases,
  });
  const releases = useQuery({
    queryKey: ["app-releases"],
    queryFn: getReleases,
    enabled: view === "releases" && canReadReleases,
  });
  const audit = useQuery({
    queryKey: ["audit"],
    queryFn: getAudit,
    enabled: view === "audit" && canReadAudit,
  });
  const imports = useQuery({
    queryKey: ["import-history"],
    queryFn: getImportHistory,
    enabled: view === "database" && canReadImports,
  });
  const backup = useMutation({
    mutationFn: downloadDatabaseBackup,
    onError: (e) =>
      notify(e instanceof Error ? e.message : "دریافت نسخه پشتیبان انجام نشد.", "error"),
  });
  const restore = useMutation({
    mutationFn: () =>
      file ? restoreDatabase(file) : Promise.reject(new Error("فایل انتخاب نشده است.")),
    onSuccess: () => {
      setFile(null);
      notify("پایگاه داده با موفقیت بازیابی شد.");
      void qc.invalidateQueries({ queryKey: ["system-database"] });
    },
    onError: (e) => notify(e instanceof Error ? e.message : "بازیابی انجام نشد.", "error"),
  });
  const saveRelease = useMutation({
    mutationFn: () => saveAppRelease(release),
    onSuccess: () => {
      setRelease({ ...release, version: "", notes: "" });
      notify("انتشار ثبت شد.");
      void qc.invalidateQueries({ queryKey: ["app-releases"] });
    },
    onError: (e) => notify(e instanceof Error ? e.message : "ثبت انتشار انجام نشد.", "error"),
  });
  const updateVersion = useMutation({
    mutationFn: ({ app, value }: { app: string; value: { version: string; notes: string } }) =>
      saveAppVersion(app, value),
    onSuccess: () => {
      notify("نسخه فعال به‌روزرسانی شد.");
      void qc.invalidateQueries({ queryKey: ["app-versions"] });
    },
    onError: (e) => notify(e instanceof Error ? e.message : "به‌روزرسانی نسخه انجام نشد.", "error"),
  });
  async function download() {
    const result = await backup.mutateAsync();
    const url = URL.createObjectURL(result.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.filename;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("نسخه پشتیبان دانلود شد.");
  }

  if (view === "overview") {
    const destinations = [
      {
        to: "/admin/releases",
        title: "نسخه‌ها و انتشارها",
        detail: "نسخه فعال و سابقه انتشار",
        icon: PackageOpen,
        show: canReadReleases,
      },
      {
        to: "/admin/database",
        title: "پایگاه داده",
        detail: "اطلاعات، پشتیبان و بازیابی",
        icon: Database,
        show: canReadDatabase,
      },
      {
        to: "/admin/audit",
        title: "ممیزی امنیتی",
        detail: "رویدادهای حساس و قابل رهگیری",
        icon: ShieldCheck,
        show: canReadAudit,
      },
      {
        to: "/admin/settings",
        title: "امنیت حساب من",
        detail: "رمز، نشست‌ها و تنظیمات محلی",
        icon: FileClock,
        show: true,
      },
    ].filter((item) => item.show);
    return (
      <div className="grid gap-5">
        <section className="grid gap-3 sm:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold">
                <Activity size={18} />
                سرویس API
              </span>
              <Badge tone={health.data?.status === "ok" ? "green" : "neutral"}>
                {health.isLoading ? "در حال بررسی" : health.data?.status || "نامشخص"}
              </Badge>
            </div>
            {health.isError ? (
              <QueryError retry={() => void health.refetch()} />
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                {health.data?.service || "اتصال به سرویس v2"}
              </p>
            )}
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold">
                <Database size={18} />
                آمادگی داده
              </span>
              <Badge tone={ready.data?.database === "ready" ? "green" : "neutral"}>
                {ready.isLoading ? "در حال بررسی" : ready.data?.database || "نامشخص"}
              </Badge>
            </div>
            {ready.isError ? (
              <QueryError retry={() => void ready.refetch()} />
            ) : (
              <p className="mt-3 text-sm text-slate-500">آزمون مستقیم اتصال پایگاه داده</p>
            )}
          </Card>
        </section>
        <section aria-labelledby="system-tools">
          <h2
            id="system-tools"
            className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200"
          >
            ابزارهای در دسترس شما
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {destinations.map(({ to, title, detail, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-900"
              >
                <Icon className="text-brand" size={22} />
                <strong className="mt-5 block">{title}</strong>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span>
              </Link>
            ))}
          </div>
        </section>
        {auth.hasRole("PLATFORM_ADMIN") ? <RelaxationMusicManager /> : null}
      </div>
    );
  }
  if (view === "releases")
    return (
      <div className="grid gap-5">
        {!canManageReleases ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
            این بخش برای نقش شما فقط خواندنی است.
          </div>
        ) : null}
        {canManageReleases ? (
          <ReleasePanel
            release={release}
            setRelease={setRelease}
            busy={saveRelease.isPending}
            onSubmit={() =>
              void modal
                .confirm({
                  title: "ثبت انتشار جدید؟",
                  description: `${release.app} · ${release.version}`,
                  confirmLabel: "ثبت انتشار",
                })
                .then((ok) => ok && saveRelease.mutate())
            }
          />
        ) : null}
        <AppVersionManager
          versions={versions.data}
          loading={versions.isLoading}
          error={versions.isError}
          busy={updateVersion.isPending}
          canManage={canManageReleases}
          onRetry={() => void versions.refetch()}
          onSave={(app, value) => updateVersion.mutate({ app, value })}
        />
        <SystemHistory
          title="تاریخچه انتشارها"
          rows={releases.data}
          loading={releases.isLoading}
          error={releases.isError}
          onRetry={() => void releases.refetch()}
        />
      </div>
    );
  if (view === "database")
    return (
      <div className="grid gap-5">
        {database.isError ? (
          <Card className="p-5">
            <QueryError retry={() => void database.refetch()} />
          </Card>
        ) : (
          <section
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
            aria-label="اطلاعات پایگاه داده"
          >
            {[
              ["موتور", database.data?.engine],
              ["وضعیت", database.data?.status],
              ["مهاجرت‌ها", database.data?.migrations?.toLocaleString("fa-IR")],
              [
                "حجم",
                database.data
                  ? `${(database.data.sizeBytes / 1024 / 1024).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} MB`
                  : undefined,
              ],
            ].map(([label, value]) => (
              <Card key={label} className="p-4">
                <span className="text-xs text-slate-500">{label}</span>
                <strong className="mt-2 block">
                  {database.isLoading ? "در حال بررسی…" : value || "نامشخص"}
                </strong>
              </Card>
            ))}
          </section>
        )}
        <DatabaseBackupPanel
          file={file}
          busy={restore.isPending}
          downloading={backup.isPending}
          setFile={setFile}
          canBackup={auth.can("database.backup")}
          canRestore={auth.can("database.restore")}
          restoreEnabled={Boolean(database.data?.remoteRestoreEnabled)}
          onDownload={() => void download()}
          onRestore={() =>
            void modal
              .confirm({
                title: "بازیابی پایگاه داده؟",
                description: `فایل ${file?.name || "انتخاب‌شده"} داده فعلی را جایگزین می‌کند و پیش از آن snapshot ساخته می‌شود.`,
                tone: "danger",
                confirmLabel: "بازیابی پایگاه داده",
              })
              .then((ok) => ok && restore.mutate())
          }
        />
        {canReadImports ? (
          <SystemHistory
            title="تاریخچه ورود داده"
            rows={imports.data}
            loading={imports.isLoading}
            error={imports.isError}
            onRetry={() => void imports.refetch()}
          />
        ) : null}
      </div>
    );
  return (
    <div className="grid gap-5">
      <SystemHistory
        title="رویدادهای ممیزی"
        rows={audit.data}
        loading={audit.isLoading}
        error={audit.isError}
        onRetry={() => void audit.refetch()}
      />
    </div>
  );
}
