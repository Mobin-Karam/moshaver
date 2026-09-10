import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, RefreshCw, SlidersHorizontal, UsersRound, WandSparkles } from "lucide-react";
import { useState } from "react";
import { Button, Card } from "../../../shared/ui/ui";
import { ManagementPageHeader, ManagementStat, ManagementSummaryBar } from "../../../shared/ui/management-workspace";
import { assignStudent, listAdvisors, listOnboardingOrganizations, listPendingStudents, type AssignmentInput, type StudentAssignment } from "../api/onboarding.api";

type Mode = "AUTO" | "MANUAL";
type ManualChoice = { organizationId: string; advisorUserId: string };

export function OnboardingPage() {
  const qc = useQueryClient();
  const students = useQuery({ queryKey: ["onboarding", "pending"], queryFn: listPendingStudents });
  const organizations = useQuery({ queryKey: ["organizations", "onboarding"], queryFn: listOnboardingOrganizations });
  const advisors = useQuery({ queryKey: ["users", "advisors", "onboarding"], queryFn: listAdvisors });
  const [mode, setMode] = useState<Mode>("AUTO");
  const [selection, setSelection] = useState<Record<string, ManualChoice>>({});
  const [completed, setCompleted] = useState<StudentAssignment | null>(null);
  const mutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: AssignmentInput }) => assignStudent(id, values), onSuccess: (result) => { setCompleted(result); void qc.invalidateQueries({ queryKey: ["onboarding", "pending"] }); } });

  return <section className="space-y-5">
    <ManagementPageHeader eyebrow="افراد و دسترسی" title="ورودی دانش‌آموزان" description="ثبت‌نام‌های جدید را بررسی و با تخصیص خودکار یا دستی به سازمان و مشاور متصل کنید." />
    <ManagementSummaryBar><ManagementStat label="در انتظار" value={students.data?.length ?? 0} active/><ManagementStat label="سازمان فعال" value={organizations.data?.filter((item) => item.status === "ACTIVE").length ?? 0}/><ManagementStat label="مشاور آماده" value={advisors.data?.length ?? 0} tone="success"/></ManagementSummaryBar>
    <Card className="p-2"><div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="روش تخصیص"><ModeButton active={mode === "AUTO"} icon={<WandSparkles/>} title="تخصیص خودکار" description="سریع و متعادل" onClick={() => setMode("AUTO")}/><ModeButton active={mode === "MANUAL"} icon={<SlidersHorizontal/>} title="انتخاب دستی" description="سازمان و مشاور مشخص" onClick={() => setMode("MANUAL")}/></div></Card>
    {completed ? <Card className="border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100" role="status"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0"/><div><h2 className="font-black">تخصیص با موفقیت انجام شد</h2><p className="mt-1 text-sm">سازمان: {completed.organization.name} · مشاور: {displayAdvisor(completed.advisor)}</p><p className="mt-1 text-xs opacity-70">عضویت، ارتباط مشاور و گفتگوی مستقیم نیز به‌صورت خودکار ساخته یا فعال شدند.</p></div></div></Card> : null}
    {students.isLoading ? <Card className="p-6 text-center" role="status">در حال دریافت صف ثبت‌نام…</Card> : null}
    {students.isError ? <Card className="border-rose-200 p-6 text-center text-rose-700" role="alert"><p>دریافت صف دانش‌آموزان انجام نشد.</p><Button className="mt-4" variant="soft" onClick={() => void students.refetch()}><RefreshCw size={16}/>تلاش دوباره</Button></Card> : null}
    {!students.isLoading && !students.isError && !students.data?.length ? <Card className="p-8 text-center"><CheckCircle2 className="mx-auto text-emerald-600"/><h2 className="mt-3 font-bold">صف ورودی خالی است</h2><p className="mt-2 text-sm text-slate-500">همه دانش‌آموزان جدید تعیین تکلیف شده‌اند.</p></Card> : null}
    <div className="grid gap-4">{students.data?.map((student) => {
      const value = selection[student.id] || { organizationId: "", advisorUserId: "" };
      const set = (patch: Partial<ManualChoice>) => setSelection((current) => ({ ...current, [student.id]: { ...value, ...patch } }));
      const eligibleAdvisors = advisors.data?.filter((item) => item.assignments.some((assignment) => assignment.role === "ADVISOR" && assignment.organizationId === value.organizationId)) || [];
      const busy = mutation.isPending && mutation.variables?.id === student.id;
      const manualUnavailable = organizations.isError || advisors.isError;
      const input: AssignmentInput = mode === "AUTO" ? { mode: "AUTO" } : { mode: "MANUAL", ...value };
      return <Card key={student.id} className="overflow-hidden p-0"><div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(220px,1fr)_minmax(320px,1.5fr)] lg:items-center"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand/10 font-black text-brand">{student.name.slice(0,1)}</span><div className="min-w-0"><h2 className="truncate font-black">{student.name}</h2><p className="mt-1 text-sm text-slate-500">{student.username}</p><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">{student.grade || "پایه نامشخص"}</span><span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">{student.major || "رشته نامشخص"}</span></div></div></div><div>{mode === "AUTO" ? <div className="rounded-2xl border border-brand/15 bg-brand/5 p-4"><div className="flex items-center gap-2 font-bold"><WandSparkles className="text-brand" size={18}/>انتخاب هوشمند آماده است</div><p className="mt-1 text-xs leading-6 text-slate-500">سازمان فعال و مشاور دارای نقش معتبر با کمترین تعداد دانش‌آموز فعال انتخاب می‌شوند.</p></div> : <div className="grid gap-3 sm:grid-cols-2"><Field icon={<Building2/>} label="سازمان"><select value={value.organizationId} onChange={(event) => set({ organizationId: event.target.value, advisorUserId: "" })}><option value="">انتخاب سازمان</option>{organizations.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field icon={<UsersRound/>} label="مشاور"><select value={value.advisorUserId} onChange={(event) => set({ advisorUserId: event.target.value })} disabled={!value.organizationId}><option value="">{value.organizationId && !eligibleAdvisors.length ? "مشاور فعالی موجود نیست" : "انتخاب مشاور"}</option>{eligibleAdvisors.map((item) => <option key={item.id} value={item.id}>{displayAdvisor(item)}</option>)}</select></Field></div>}{mode === "MANUAL" && manualUnavailable ? <p className="mt-2 text-xs text-rose-700">فهرست سازمان یا مشاور دریافت نشد؛ دوباره تلاش کنید یا از حالت خودکار استفاده کنید.</p> : null}<Button className="mt-3 w-full" loading={busy} disabled={busy || (mode === "MANUAL" && (manualUnavailable || !value.organizationId || !value.advisorUserId))} onClick={() => mutation.mutate({ id: student.id, values: input })}>{mode === "AUTO" ? "تخصیص خودکار و فعال‌سازی" : "تأیید انتخاب و فعال‌سازی"}</Button></div></div></Card>;
    })}</div>
    {mutation.isError ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">{mutation.error instanceof Error ? mutation.error.message : "تخصیص انجام نشد."}</p> : null}
  </section>;
}

function ModeButton({ active, icon, title, description, onClick }: { active: boolean; icon: React.ReactNode; title: string; description: string; onClick: () => void }) { return <button type="button" role="radio" aria-checked={active} onClick={onClick} className={`flex min-h-20 items-center gap-3 rounded-2xl p-3 text-right transition ${active ? "bg-slate-900 text-white shadow-sm dark:bg-brand" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${active ? "bg-white/10" : "bg-brand/10 text-brand"}`}>{icon}</span><span><strong className="block text-sm">{title}</strong><small className={`mt-1 block ${active ? "text-white/65" : "text-slate-500"}`}>{description}</small></span></button>; }
function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactElement }) { return <label className="grid gap-1 text-sm font-bold"><span className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><span className="[&>svg]:size-4">{icon}</span>{label}</span><span className="[&>select]:h-12 [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:bg-white [&>select]:px-3 dark:[&>select]:bg-slate-900">{children}</span></label>; }
function displayAdvisor(user: { username: string; firstName?: string; lastName?: string }) { return [user.firstName,user.lastName].filter(Boolean).join(" ") || user.username; }
