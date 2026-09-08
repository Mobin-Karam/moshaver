import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, Pencil, Plus, Search, ShieldCheck, X } from "lucide-react";
import { useAuth } from "../auth";
import type { OrganizationSummary, RoleCode } from "../../shared/types/domain";
import { roleLabels } from "../../shared/lib/role-ui";
import { useModal } from "../../shared/ui/modal";
import { notify } from "../../shared/ui/notifications";
import { Button, Card, EmptyState, Field, Input, Select } from "../../shared/ui/ui";
import { AdminDataTable } from "../../shared/ui/admin-data-table";
import {
  archiveOrganization,
  archiveUser,
  createOrganization,
  createUser,
  listOrganizations,
  listUsers,
  setUserActive,
  setUserRoles,
  updateOrganization,
  updateUser,
  type PortalOrganization,
  type PortalUser,
} from "./api/access.api";
import { OrganizationWorkspace } from "./OrganizationWorkspace";

const allRoles = Object.keys(roleLabels) as RoleCode[];
const organizationTypes = [
  ["SCHOOL", "مدرسه"],
  ["ACADEMY", "آکادمی"],
  ["COUNSELING_CENTER", "مرکز مشاوره"],
  ["PRIVATE_PRACTICE", "مجموعه خصوصی"],
  ["OTHER", "سایر"],
] as const;
const statusLabels: Record<string, string> = {
  ACTIVE: "فعال",
  INACTIVE: "غیرفعال",
  DISABLED: "غیرفعال",
  ARCHIVED: "بایگانی‌شده",
};
const nameOf = (user: PortalUser) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function UsersPage() {
  const auth = useAuth(),
    modal = useModal(),
    qc = useQueryClient();
  const canManage = auth.can("users.manage"),
    isPlatform = auth.hasRole("PLATFORM_ADMIN");
  const organizations = useQuery({
    queryKey: ["organizations"],
    queryFn: listOrganizations,
    enabled: isPlatform,
  });
  const [organizationId, setOrganizationId] = useState(auth.context?.activeOrganization?.id ?? "");
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("ALL"),
    [creating, setCreating] = useState(false),
    [selectedIds, setSelectedIds] = useState<string[]>([]);
  const users = useQuery({
    queryKey: ["users", organizationId || "platform"],
    queryFn: () => listUsers(organizationId || undefined),
  });
  const [draft, setDraft] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "ADVISOR" as RoleCode,
    organizationId: auth.context?.activeOrganization?.id ?? "",
  });
  const [editing, setEditing] = useState<PortalUser | null>(null);
  const [editDraft, setEditDraft] = useState({
    username: "",
    firstName: "",
    lastName: "",
    role: "ADVISOR" as RoleCode,
    organizationId: "",
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["users"] });
  const create = useMutation({
    mutationFn: () =>
      createUser({
        username: draft.username,
        password: draft.password,
        firstName: draft.firstName,
        lastName: draft.lastName,
        roleCodes: [draft.role],
        ...(draft.role !== "PLATFORM_ADMIN"
          ? { organizationId: draft.organizationId || organizationId }
          : {}),
      }),
    onSuccess: async () => {
      setDraft((v) => ({ ...v, username: "", password: "", firstName: "", lastName: "" }));
      setCreating(false);
      notify("حساب کاربری ساخته شد.");
      await refresh();
    },
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setUserActive(id, active),
    onSuccess: async () => {
      await refresh();
      notify("وضعیت حساب به‌روزرسانی شد.");
    },
  });
  const archive = useMutation({
    mutationFn: archiveUser,
    onSuccess: async () => {
      await refresh();
      notify("حساب بایگانی شد.");
    },
  });
  const bulkStatus = useMutation({
    mutationFn: ({ ids, active }: { ids: string[]; active: boolean }) =>
      Promise.all(ids.map((id) => setUserActive(id, active))),
    onSuccess: async (_, values) => {
      setSelectedIds([]);
      await refresh();
      notify(`${values.ids.length.toLocaleString("fa-IR")} حساب به‌روزرسانی شد.`);
    },
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await updateUser(editing.id, {
        username: editDraft.username,
        firstName: editDraft.firstName,
        lastName: editDraft.lastName,
      });
      await setUserRoles(editing.id, {
        roleCodes: [editDraft.role],
        ...(editDraft.role !== "PLATFORM_ADMIN"
          ? { organizationId: editDraft.organizationId || organizationId }
          : {}),
      });
    },
    onSuccess: async () => {
      setEditing(null);
      notify("مشخصات و دسترسی حساب ذخیره شد.");
      await refresh();
    },
  });
  const visible = useMemo(
    () =>
      (users.data || []).filter((user) => {
        const term = search.trim().toLowerCase();
        return (
          (!term || `${nameOf(user)} ${user.username}`.toLowerCase().includes(term)) &&
          (status === "ALL" || user.status === status)
        );
      }),
    [search, status, users.data],
  );
  const startEdit = (user: PortalUser) => {
    const assignment =
      user.assignments.find((item) => item.organizationId === organizationId) ??
      user.assignments[0];
    setEditing(user);
    setEditDraft({
      username: user.username,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      role: assignment?.role ?? "ADVISOR",
      organizationId: assignment?.organizationId ?? organizationId,
    });
  };

  return (
    <div className="grid gap-5">
      <section className="grid gap-3" aria-label="ابزارهای فهرست کاربران">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" aria-label="خلاصه کاربران">
            <SummaryPill label="همه حساب‌ها" value={users.data?.length ?? 0} />
            <SummaryPill
              label="فعال"
              value={users.data?.filter((x) => x.status === "ACTIVE").length ?? 0}
              tone="green"
            />
            <SummaryPill
              label="نقش"
              value={new Set(users.data?.flatMap((x) => x.assignments.map((a) => a.role))).size}
            />
          </div>
          {canManage ? (
            <Button
              onClick={() => {
                setEditing(null);
                setCreating((value) => !value);
              }}
            >
              <Plus size={16} />
              {creating ? "بستن فرم" : "کاربر جدید"}
            </Button>
          ) : null}
        </div>
        <Card className="p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px_180px]">
            <Field label="جستجو">
              <div className="relative">
                <Search className="absolute right-3 top-3 text-slate-400" size={18} />
                <Input
                  className="pr-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="نام یا نام کاربری…"
                />
              </div>
            </Field>
            {isPlatform ? (
              <Field label="محدوده سازمان">
                <Select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
                  <option value="">همه پلتفرم</option>
                  {organizations.data?.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <Field label="وضعیت">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="ACTIVE">فعال</option>
                <option value="DISABLED">غیرفعال</option>
                <option value="ARCHIVED">بایگانی‌شده</option>
              </Select>
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800">
            <span>
              {visible.length.toLocaleString("fa-IR")} نتیجه از{" "}
              {(users.data?.length || 0).toLocaleString("fa-IR")}
            </span>
            {search || status !== "ALL" ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 font-bold text-brand"
                onClick={() => {
                  setSearch("");
                  setStatus("ALL");
                }}
              >
                <X size={14} />
                پاک‌کردن فیلترها
              </button>
            ) : null}
          </div>
        </Card>
      </section>
      {canManage && creating ? (
        <Card className="p-5">
          <SectionTitle
            icon={<Plus size={18} />}
            title="ساخت حساب جدید"
            subtitle="حساب را از ابتدا با نقش و محدوده درست ایجاد کنید."
          />
          <form
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <Field label="نام کاربری">
              <Input
                required
                minLength={2}
                dir="ltr"
                value={draft.username}
                onChange={(e) => setDraft({ ...draft, username: e.target.value })}
              />
            </Field>
            <Field label="رمز اولیه (حداقل ۱۲ نویسه)">
              <Input
                required
                minLength={12}
                type="password"
                dir="ltr"
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              />
            </Field>
            <RoleField
              value={draft.role}
              onChange={(role) => setDraft({ ...draft, role })}
              allowPlatform={isPlatform}
            />
            <Field label="نام">
              <Input
                value={draft.firstName}
                onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
              />
            </Field>
            <Field label="نام خانوادگی">
              <Input
                value={draft.lastName}
                onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
              />
            </Field>
            {isPlatform && draft.role !== "PLATFORM_ADMIN" ? (
              <OrganizationField
                organizations={organizations.data || []}
                value={draft.organizationId || organizationId}
                onChange={(value) => setDraft({ ...draft, organizationId: value })}
              />
            ) : null}
            <div className="flex items-end">
              <Button
                className="w-full"
                loading={create.isPending}
                disabled={
                  draft.role !== "PLATFORM_ADMIN" && !(draft.organizationId || organizationId)
                }
              >
                ساخت حساب
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                انصراف
              </Button>
            </div>
            {create.isError ? (
              <p role="alert" className="text-sm text-rose-700">
                {errorText(create.error, "ساخت حساب ناموفق بود.")}
              </p>
            ) : null}
          </form>
        </Card>
      ) : null}
      {editing ? (
        <Card className="border-brand/30 p-5">
          <SectionTitle
            icon={<Pencil size={18} />}
            title={`ویرایش ${nameOf(editing)}`}
            subtitle="مشخصات، نقش و محدوده دسترسی را یکجا ذخیره کنید."
          />
          <form
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <Field label="نام کاربری">
              <Input
                required
                minLength={2}
                dir="ltr"
                value={editDraft.username}
                onChange={(e) => setEditDraft({ ...editDraft, username: e.target.value })}
              />
            </Field>
            <Field label="نام">
              <Input
                value={editDraft.firstName}
                onChange={(e) => setEditDraft({ ...editDraft, firstName: e.target.value })}
              />
            </Field>
            <Field label="نام خانوادگی">
              <Input
                value={editDraft.lastName}
                onChange={(e) => setEditDraft({ ...editDraft, lastName: e.target.value })}
              />
            </Field>
            <RoleField
              value={editDraft.role}
              onChange={(role) => setEditDraft({ ...editDraft, role })}
              allowPlatform={isPlatform}
            />
            {editDraft.role !== "PLATFORM_ADMIN" ? (
              <OrganizationField
                organizations={organizations.data || []}
                value={editDraft.organizationId}
                onChange={(value) => setEditDraft({ ...editDraft, organizationId: value })}
              />
            ) : null}
            <div className="flex items-end gap-2">
              <Button loading={save.isPending}>ذخیره تغییرات</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                انصراف
              </Button>
            </div>
            {save.isError ? (
              <p role="alert" className="text-sm text-rose-700">
                {errorText(save.error, "ویرایش حساب ناموفق بود.")}
              </p>
            ) : null}
          </form>
        </Card>
      ) : null}
      <Card className="overflow-hidden" aria-label="فهرست کاربران">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="font-black">فهرست کاربران</h2>
          <p className="text-xs text-slate-500">
            نقش و عملیات مجاز هر حساب در همان ردیف در دسترس است.
          </p>
        </div>
        {users.isLoading ? (
          <LoadingRows />
        ) : users.isError ? (
          <Retry message="دریافت کاربران ناموفق بود." retry={() => users.refetch()} />
        ) : !visible.length ? (
          <div className="p-6">
            <EmptyState title="کاربری با این فیلتر یافت نشد." />
          </div>
        ) : (
          <AdminDataTable
            rows={visible}
            rowId={(user) => user.id}
            label="فهرست کاربران"
            selectedIds={selectedIds}
            onSelectionChange={canManage ? setSelectedIds : undefined}
            batchActions={(selectedRows) => (
              <>
                {
                  <Button
                    variant="soft"
                    className="h-9"
                    loading={bulkStatus.isPending}
                    onClick={() =>
                      bulkStatus.mutate({ ids: selectedRows.map((user) => user.id), active: true })
                    }
                  >
                    فعال‌سازی
                  </Button>
                }
                <Button
                  variant="soft"
                  className="h-9"
                  loading={bulkStatus.isPending}
                  onClick={() =>
                    void modal
                      .confirm({
                        title: "غیرفعال‌کردن حساب‌های انتخاب‌شده؟",
                        description: `دسترسی ${selectedRows.length.toLocaleString("fa-IR")} حساب متوقف می‌شود.`,
                        tone: "danger",
                        confirmLabel: "غیرفعال‌کردن",
                      })
                      .then(
                        (confirmed) =>
                          confirmed &&
                          bulkStatus.mutate({
                            ids: selectedRows.map((user) => user.id),
                            active: false,
                          }),
                      )
                  }
                >
                  غیرفعال‌کردن
                </Button>
              </>
            )}
            columns={[
              {
                id: "user",
                header: "کاربر",
                cell: (user) => (
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{nameOf(user)}</strong>
                      <StatusPill status={user.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500" dir="ltr">
                      {user.username}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {user.assignments.map((item, index) => (
                        <span
                          key={`${item.role}-${item.organizationId}-${index}`}
                          className="rounded-full bg-brand/10 px-2 py-1 text-[11px] font-bold text-brand"
                        >
                          {roleLabels[item.role] || item.role}
                          {item.organizationId
                            ? ` · ${organizations.data?.find((org) => org.id === item.organizationId)?.name || "سازمان"}`
                            : " · سطح پلتفرم"}
                        </span>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                id: "actions",
                header: "عملیات",
                cell: (user) =>
                  canManage ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="soft" onClick={() => startEdit(user)}>
                        <Pencil size={15} />
                        ویرایش
                      </Button>
                      <Button
                        variant="soft"
                        loading={toggle.isPending && toggle.variables?.id === user.id}
                        disabled={toggle.isPending || archive.isPending}
                        onClick={() =>
                          user.status === "ACTIVE"
                            ? void modal
                                .confirm({
                                  title: "غیرفعال‌کردن حساب؟",
                                  description: `دسترسی ${nameOf(user)} و نشست‌های فعال او متوقف می‌شود.`,
                                  tone: "danger",
                                  confirmLabel: "غیرفعال‌کردن",
                                })
                                .then(
                                  (confirmed) =>
                                    confirmed && toggle.mutate({ id: user.id, active: false }),
                                )
                            : toggle.mutate({ id: user.id, active: true })
                        }
                      >
                        {user.status === "ACTIVE" ? "غیرفعال" : "فعال‌سازی"}
                      </Button>
                      {isPlatform && user.status !== "ARCHIVED" ? (
                        <Button
                          variant="danger"
                          loading={archive.isPending && archive.variables === user.id}
                          disabled={archive.isPending || toggle.isPending}
                          onClick={async () => {
                            if (
                              await modal.confirm({
                                title: "بایگانی حساب",
                                description: `حساب ${nameOf(user)} بایگانی و نشست‌های آن بسته شود؟`,
                                confirmLabel: "بایگانی",
                                tone: "danger",
                                cancelLabel: "انصراف",
                                showCancel: true,
                              })
                            )
                              archive.mutate(user.id);
                          }}
                        >
                          بایگانی
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">فقط مشاهده</span>
                  ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}

export function OrganizationsPage() {
  const auth = useAuth(),
    modal = useModal(),
    qc = useQueryClient();
  const isPlatform = auth.hasRole("PLATFORM_ADMIN"),
    canManage = isPlatform && auth.can("organization.manage");
  const organizations = useQuery({ queryKey: ["organizations"], queryFn: listOrganizations });
  const [search, setSearch] = useState(""),
    [draft, setDraft] = useState({ name: "", type: "SCHOOL" }),
    [editing, setEditing] = useState<PortalOrganization | null>(null),
    [creating, setCreating] = useState(false),
    [selectedId, setSelectedId] = useState(auth.context?.activeOrganization?.id ?? "");
  const refresh = () => qc.invalidateQueries({ queryKey: ["organizations"] });
  const create = useMutation({
    mutationFn: () => createOrganization(draft),
    onSuccess: async () => {
      setDraft({ name: "", type: "SCHOOL" });
      setCreating(false);
      notify("سازمان ساخته شد.");
      await refresh();
    },
  });
  const update = useMutation({
    mutationFn: (org: PortalOrganization) =>
      updateOrganization(org.id, { name: org.name, type: org.type, status: org.status }),
    onSuccess: async () => {
      setEditing(null);
      notify("اطلاعات سازمان ذخیره شد.");
      await refresh();
    },
  });
  const archive = useMutation({
    mutationFn: archiveOrganization,
    onSuccess: async () => {
      await refresh();
      notify("سازمان بایگانی شد.");
    },
  });
  const filtered = (organizations.data || []).filter((item) =>
    item.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const selected = (organizations.data || []).find((item) => item.id === selectedId);
  const activate = (org: PortalOrganization) =>
    auth.setActiveOrganization({
      id: org.id,
      membershipId: "",
      name: org.name,
      type: org.type,
    } as OrganizationSummary);
  return (
    <div className="grid gap-5">
      <section className="grid gap-3" aria-label="ابزارهای فهرست سازمان‌ها">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <SummaryPill label="همه سازمان‌ها" value={organizations.data?.length ?? 0} />
            <SummaryPill
              label="فعال"
              value={organizations.data?.filter((x) => x.status === "ACTIVE").length ?? 0}
              tone="green"
            />
            <SummaryPill
              label="بایگانی"
              value={organizations.data?.filter((x) => x.status === "ARCHIVED").length ?? 0}
            />
          </div>
          {canManage ? (
            <Button
              onClick={() => {
                setEditing(null);
                setCreating((value) => !value);
              }}
            >
              <Plus size={16} />
              {creating ? "بستن فرم" : "سازمان جدید"}
            </Button>
          ) : null}
        </div>
        <Card className="p-4">
          <Field label="جستجوی سازمان">
            <div className="relative">
              <Search className="absolute right-3 top-3 text-slate-400" size={18} />
              <Input
                className="pr-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="نام سازمان…"
              />
            </div>
          </Field>
          <div className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800">
            {filtered.length.toLocaleString("fa-IR")} نتیجه
          </div>
        </Card>
      </section>
      {canManage && creating ? (
        <Card className="p-5">
          <SectionTitle
            icon={<Plus size={18} />}
            title="سازمان جدید"
            subtitle="نوع سازمان را برای نمایش و گزارش‌گیری دقیق انتخاب کنید."
          />
          <form
            className="mt-4 grid gap-3 sm:grid-cols-[1fr_240px_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <Field label="نام سازمان">
              <Input
                required
                minLength={2}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <OrganizationTypeField
              value={draft.type}
              onChange={(type) => setDraft({ ...draft, type })}
            />
            <div className="flex items-end">
              <div className="flex gap-2">
                <Button loading={create.isPending}>ساخت سازمان</Button>
                <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                  انصراف
                </Button>
              </div>
            </div>
            {create.isError ? (
              <p role="alert" className="text-sm text-rose-700">
                {errorText(create.error, "ساخت سازمان ناموفق بود.")}
              </p>
            ) : null}
          </form>
        </Card>
      ) : null}
      <section className="grid items-start gap-4 xl:grid-cols-[minmax(360px,.8fr)_minmax(0,1.2fr)]">
        <Card className="overflow-hidden" aria-label="فهرست سازمان‌ها">
          {organizations.isLoading ? (
            <LoadingRows />
          ) : organizations.isError ? (
            <Retry message="دریافت سازمان‌ها ناموفق بود." retry={() => organizations.refetch()} />
          ) : !filtered.length ? (
            <div className="p-6">
              <EmptyState title="سازمانی یافت نشد." />
            </div>
          ) : (
            <div className="grid gap-2 p-3">
              {filtered.map((org) => (
                <article
                  key={org.id}
                  className={`rounded-xl border p-4 transition ${selectedId === org.id ? "border-brand bg-brand/5 ring-1 ring-brand/20" : "border-slate-200 hover:border-brand/30 dark:border-slate-800"}`}
                >
                  {editing?.id === org.id ? (
                    <form
                      className="grid gap-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        update.mutate(editing);
                      }}
                    >
                      <Field label="نام">
                        <Input
                          required
                          value={editing.name}
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        />
                      </Field>
                      <OrganizationTypeField
                        value={editing.type}
                        onChange={(type) => setEditing({ ...editing, type })}
                      />
                      <Field label="وضعیت">
                        <Select
                          value={editing.status}
                          onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                        >
                          <option value="ACTIVE">فعال</option>
                          <option value="INACTIVE">غیرفعال</option>
                          <option value="ARCHIVED">بایگانی‌شده</option>
                        </Select>
                      </Field>
                      <div className="flex gap-2">
                        <Button loading={update.isPending}>ذخیره</Button>
                        <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                          انصراف
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
                          <Building2 size={21} />
                        </span>
                        <StatusPill status={org.status} />
                      </div>
                      <h2 className="mt-3 font-black">{org.name}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {organizationTypes.find(([value]) => value === org.type)?.[1] || org.type}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant={selectedId === org.id ? "primary" : "soft"}
                          disabled={org.status === "ARCHIVED"}
                          onClick={() => setSelectedId(org.id)}
                        >
                          {selectedId === org.id ? (
                            <>
                              <CheckCircle2 size={15} />
                              انتخاب‌شده
                            </>
                          ) : (
                            "بازکردن فضای کار"
                          )}
                        </Button>
                        {auth.context?.activeOrganization?.id !== org.id &&
                        org.status === "ACTIVE" ? (
                          <Button variant="ghost" onClick={() => activate(org)}>
                            انتخاب به‌عنوان زمینه کاری
                          </Button>
                        ) : null}
                        {canManage ? (
                          <>
                            <Button variant="soft" onClick={() => setEditing({ ...org })}>
                              <Pencil size={15} />
                              ویرایش
                            </Button>
                            {org.status !== "ARCHIVED" ? (
                              <Button
                                variant="danger"
                                loading={archive.isPending && archive.variables === org.id}
                                onClick={async () => {
                                  if (
                                    await modal.confirm({
                                      title: "بایگانی سازمان",
                                      description: `سازمان ${org.name} بایگانی شود؟ داده‌ها حذف نمی‌شوند.`,
                                      confirmLabel: "بایگانی",
                                      tone: "danger",
                                      cancelLabel: "انصراف",
                                      showCancel: true,
                                    })
                                  )
                                    archive.mutate(org.id);
                                }}
                              >
                                بایگانی
                              </Button>
                            ) : (
                              <Button
                                variant="soft"
                                onClick={() => update.mutate({ ...org, status: "ACTIVE" })}
                              >
                                بازیابی
                              </Button>
                            )}
                          </>
                        ) : null}
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </Card>
        <div className="xl:sticky xl:top-20">
          {selected && auth.can("organization.members.manage") && selected.status !== "ARCHIVED" ? (
            <OrganizationWorkspace organizationId={selected.id} organizationName={selected.name} />
          ) : (
            <Card className="p-6">
              <EmptyState
                title={
                  selected?.status === "ARCHIVED"
                    ? "سازمان بایگانی‌شده قابل مدیریت نیست."
                    : "یک سازمان را برای مدیریت اعضا انتخاب کنید."
                }
              />
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  tone = "brand",
}: {
  label: string;
  value: number;
  tone?: "brand" | "green";
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${tone === "green" ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}
    >
      <strong className="text-base">{value.toLocaleString("fa-IR")}</strong>
      <span className="mr-1.5 text-xs text-slate-500">{label}</span>
    </div>
  );
}
function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-9 place-items-center rounded-xl bg-brand/10 text-brand">
        {icon}
      </span>
      <div>
        <h2 className="font-black">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}
function RoleField({
  value,
  onChange,
  allowPlatform,
}: {
  value: RoleCode;
  onChange: (role: RoleCode) => void;
  allowPlatform: boolean;
}) {
  return (
    <Field label="نقش">
      <Select value={value} onChange={(e) => onChange(e.target.value as RoleCode)}>
        {allRoles
          .filter((role) => allowPlatform || role !== "PLATFORM_ADMIN")
          .map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
      </Select>
    </Field>
  );
}
function OrganizationField({
  organizations,
  value,
  onChange,
}: {
  organizations: PortalOrganization[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label="سازمان">
      <Select required value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">انتخاب سازمان…</option>
        {organizations
          .filter((item) => item.status === "ACTIVE")
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
      </Select>
    </Field>
  );
}
function OrganizationTypeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label="نوع سازمان">
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {organizationTypes.map(([type, label]) => (
          <option key={type} value={type}>
            {label}
          </option>
        ))}
      </Select>
    </Field>
  );
}
function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[11px] font-bold ${status === "ACTIVE" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : status === "ARCHIVED" ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}`}
    >
      {statusLabels[status] || status}
    </span>
  );
}
function LoadingRows() {
  return (
    <div role="status" aria-label="در حال دریافت" className="grid gap-3 p-4">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      ))}
    </div>
  );
}
function Retry({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div role="alert" className="grid justify-items-center gap-3 p-8">
      <ShieldCheck className="text-rose-600" />
      <p className="text-sm text-rose-700">{message}</p>
      <Button variant="soft" onClick={retry}>
        تلاش دوباره
      </Button>
    </div>
  );
}
