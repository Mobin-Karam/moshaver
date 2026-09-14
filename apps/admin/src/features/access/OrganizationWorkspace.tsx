import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Link2, UserPlus, Users } from "lucide-react";
import type { RoleCode } from "../../shared/types/domain";
import { Button, Card, EmptyState, Field, Select } from "../../shared/ui/ui";
import { useModal } from "../../shared/ui/modal";
import { roleLabels } from "../../shared/lib/role-ui";
import { useAuth } from "../auth";
import {
  acceptRelationship,
  addOrganizationMember,
  allowGuardianChange,
  createRelationship,
  listRelationshipStudents,
  listOrganizationMembers,
  listRelationships,
  listUsers,
  rejectRelationship,
  removeRelationship,
  removeOrganizationMember,
  updateOrganizationMember,
} from "./api/access.api";

const roles: Array<{ value: RoleCode; label: string }> = [
  { value: "STUDENT", label: "دانش‌آموز" },
  { value: "GUARDIAN", label: "سرپرست" },
  { value: "ADVISOR", label: "مشاور" },
  { value: "TEACHER", label: "دبیر" },
  { value: "MENTOR", label: "منتور" },
  { value: "CONTENT_MANAGER", label: "مدیر محتوا" },
  { value: "ORGANIZATION_ADMIN", label: "مدیر سازمان" },
];

export function OrganizationWorkspace({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const auth = useAuth();
  const qc = useQueryClient();
  const modal = useModal();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<RoleCode>("ADVISOR");
  const [relationUserId, setRelationUserId] = useState("");
  const [relationStudentId, setRelationStudentId] = useState("");
  const [relationType, setRelationType] = useState<
    "GUARDIAN_OF" | "ADVISOR_OF" | "TEACHER_OF" | "MENTOR_OF"
  >("GUARDIAN_OF");
  const members = useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: () => listOrganizationMembers(organizationId),
  });
  const users = useQuery({
    queryKey: ["users", "platform-membership-picker"],
    queryFn: () => listUsers(),
  });
  const relationships = useQuery({ queryKey: ["relationships"], queryFn: listRelationships });
  const relationshipStudents = useQuery({
    queryKey: ["students", "relationship-picker"],
    queryFn: listRelationshipStudents,
  });
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["organization-members", organizationId] }),
      qc.invalidateQueries({ queryKey: ["relationships"] }),
    ]);
  };
  const add = useMutation({
    mutationFn: () => addOrganizationMember(organizationId, { userId, roleCodes: [role] }),
    onSuccess: async () => {
      setUserId("");
      await refresh();
    },
  });
  const update = useMutation({
    mutationFn: ({
      id,
      status,
      roleCodes,
    }: {
      id: string;
      status?: "ACTIVE" | "INACTIVE";
      roleCodes?: RoleCode[];
    }) => updateOrganizationMember(organizationId, id, { status, roleCodes }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeOrganizationMember(organizationId, id),
    onSuccess: refresh,
  });
  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "reject" }) =>
      action === "accept" ? acceptRelationship(id) : rejectRelationship(id),
    onSuccess: refresh,
  });
  const createLink = useMutation({
    mutationFn: () =>
      createRelationship({
        fromUserId: relationUserId,
        toStudentId: relationStudentId,
        organizationId,
        type: relationType,
      }),
    onSuccess: async () => {
      setRelationUserId("");
      setRelationStudentId("");
      await refresh();
    },
  });
  const revokeLink = useMutation({ mutationFn: removeRelationship, onSuccess: refresh });
  const guardianOverride = useMutation({ mutationFn: allowGuardianChange });
  const available = (users.data || []).filter(
    (user) => !members.data?.some((member) => member.user.id === user.id),
  );
  const relevant = (relationships.data || []).filter(
    (item) => !item.organizationId || item.organizationId === organizationId,
  );

  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
            <Building2 size={19} />
          </span>
          <div>
            <h2 className="font-black">{organizationName}</h2>
            <p className="text-xs text-slate-500">عضویت، نقش‌ها و ارتباط سرپرست با دانش‌آموز</p>
          </div>
        </div>
        <form
          className="grid gap-3 md:grid-cols-[1fr_180px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
        >
          <Field label="افزودن کاربر">
            <Select required value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">انتخاب کاربر…</option>
              {available.map((user) => (
                <option key={user.id} value={user.id}>
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.username}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="نقش سازمانی">
            <Select value={role} onChange={(e) => setRole(e.target.value as RoleCode)}>
              {roles.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Button className="md:mt-6" loading={add.isPending} disabled={!userId}>
            <UserPlus size={16} />
            افزودن
          </Button>
        </form>
        {add.isError ? (
          <p role="alert" className="mt-2 text-sm text-rose-700">
            افزودن عضو ناموفق بود.
          </p>
        ) : null}
      </Card>
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users size={18} />
          <h3 className="font-bold">اعضای سازمان</h3>
        </div>
        <form
          className="mb-4 grid gap-3 rounded-xl border p-3 md:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            createLink.mutate();
          }}
        >
          <Field label="کاربر مرتبط">
            <Select
              required
              value={relationUserId}
              onChange={(event) => setRelationUserId(event.target.value)}
            >
              <option value="">انتخاب کاربر…</option>
              {(users.data ?? [])
                .filter((user) =>
                  user.assignments.some((assignment) => assignment.role !== "STUDENT"),
                )
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.username}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="دانش‌آموز">
            <Select
              required
              value={relationStudentId}
              onChange={(event) => setRelationStudentId(event.target.value)}
            >
              <option value="">انتخاب دانش‌آموز…</option>
              {(relationshipStudents.data ?? []).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="نوع ارتباط">
            <Select
              value={relationType}
              onChange={(event) => setRelationType(event.target.value as typeof relationType)}
            >
              <option value="GUARDIAN_OF">سرپرست</option>
              <option value="ADVISOR_OF">مشاور</option>
              <option value="TEACHER_OF">دبیر</option>
              <option value="MENTOR_OF">منتور</option>
            </Select>
          </Field>
          <Button
            className="md:mt-6"
            loading={createLink.isPending}
            disabled={!relationUserId || !relationStudentId}
          >
            ایجاد ارتباط
          </Button>
        </form>
        {members.isLoading ? (
          <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        ) : members.isError ? (
          <div role="alert">
            <p className="text-sm text-rose-700">اعضا دریافت نشدند.</p>
            <Button variant="soft" onClick={() => members.refetch()}>
              تلاش دوباره
            </Button>
          </div>
        ) : !members.data?.length ? (
          <EmptyState title="این سازمان هنوز عضوی ندارد." />
        ) : (
          <div className="grid gap-2">
            {members.data.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <div>
                  <strong>
                    {[member.user.firstName, member.user.lastName].filter(Boolean).join(" ") ||
                      member.user.username}
                  </strong>
                  <p className="text-xs text-slate-500">
                    {member.roles.map((item) => roleLabels[item] || item).join("، ") || "بدون نقش"}{" "}
                    · {member.status === "ACTIVE" ? "فعال" : "غیرفعال"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Select
                    aria-label={`نقش ${member.user.username}`}
                    value={member.roles[0] || "ADVISOR"}
                    disabled={update.isPending}
                    onChange={(event) =>
                      update.mutate({
                        id: member.user.id,
                        roleCodes: [event.target.value as RoleCode],
                      })
                    }
                  >
                    {roles.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="soft"
                    loading={update.isPending}
                    onClick={() =>
                      update.mutate({
                        id: member.user.id,
                        status: member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                      })
                    }
                  >
                    {member.status === "ACTIVE" ? "تعلیق" : "فعال‌سازی"}
                  </Button>
                  <Button
                    variant="danger"
                    loading={remove.isPending}
                    onClick={() =>
                      void modal
                        .confirm({
                          title: "حذف عضو از سازمان؟",
                          description: `عضویت ${member.user.firstName || member.user.username} حذف می‌شود؛ حساب کاربری او حذف نخواهد شد.`,
                          tone: "danger",
                          confirmLabel: "حذف عضویت",
                        })
                        .then((confirmed) => confirmed && remove.mutate(member.user.id))
                    }
                  >
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Link2 size={18} />
          <h3 className="font-bold">درخواست‌های ارتباط</h3>
        </div>
        {relationships.isLoading ? (
          <div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        ) : relationships.isError ? (
          <div role="alert">
            <p className="text-sm text-rose-700">ارتباط‌ها دریافت نشدند.</p>
            <Button variant="soft" onClick={() => relationships.refetch()}>
              تلاش دوباره
            </Button>
          </div>
        ) : !relevant.length ? (
          <EmptyState title="درخواست ارتباطی وجود ندارد." />
        ) : (
          <div className="grid gap-2">
            {relevant.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <div>
                  <strong>
                    {[item.fromUser.firstName, item.fromUser.lastName].filter(Boolean).join(" ") ||
                      item.fromUser.username}{" "}
                    ← {item.student.name}
                  </strong>
                  <p className="text-xs text-slate-500">
                    {item.type === "GUARDIAN_STUDENT" ? "سرپرست و دانش‌آموز" : item.type} ·{" "}
                    {item.status === "PENDING"
                      ? "در انتظار بررسی"
                      : item.status === "ACCEPTED"
                        ? "تأییدشده"
                        : "ردشده"}
                  </p>
                </div>
                {item.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <Button
                      loading={decide.isPending}
                      onClick={() => decide.mutate({ id: item.id, action: "accept" })}
                    >
                      تأیید
                    </Button>
                    <Button
                      variant="danger"
                      loading={decide.isPending}
                      onClick={() =>
                        void modal
                          .confirm({
                            title: "رد درخواست ارتباط؟",
                            description:
                              "این درخواست رد می‌شود و برای ایجاد ارتباط، درخواست تازه‌ای لازم خواهد بود.",
                            tone: "danger",
                            confirmLabel: "رد درخواست",
                          })
                          .then(
                            (confirmed) =>
                              confirmed && decide.mutate({ id: item.id, action: "reject" }),
                          )
                      }
                    >
                      رد
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {item.type === "GUARDIAN_OF" && auth.can("system.manage") ? (
                      <Button
                        variant="soft"
                        loading={guardianOverride.isPending}
                        onClick={() => guardianOverride.mutate(item.student.id)}
                      >
                        لغو محدودیت تغییر
                      </Button>
                    ) : null}
                    <Button
                      variant="danger"
                      loading={revokeLink.isPending}
                      onClick={() => revokeLink.mutate(item.id)}
                    >
                      لغو ارتباط
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
