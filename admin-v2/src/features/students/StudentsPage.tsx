import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, Edit3, KeyRound, LogOut, MessageCircle, Power, Save, Trash2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, EmptyState, Field, Input, Button } from "../../components/ui";
import { useStudents } from "../../hooks/useStudents";
import { api } from "../../services/api";
import type { Student } from "../../types/domain";
import { useModal } from "../../components/modal";

type StudentForm = {
  name: string;
  username: string;
  password: string;
  grade: string;
  major: string;
  targetUniversity: string;
  targetField: string;
  targetRank: string;
  dailyCapacity: string;
};

export function StudentsPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<StudentForm>(emptyForm());
  const { students } = useStudents();
  const qc = useQueryClient();
  const modal = useModal();
  const create = useMutation({ mutationFn: (body: StudentForm) => api.post<Student>("/admin/students", cleanPayload(body, true)), onSuccess: (student) => { qc.invalidateQueries({ queryKey: ["students"] }); setSelectedId(student.id); setForm(fromStudent(student)); } });
  const update = useMutation({ mutationFn: () => api.patch<Student>(`/admin/students/${selectedId}`, cleanPayload(form, false)), onSuccess: (student) => { qc.invalidateQueries({ queryKey: ["students"] }); setForm(fromStudent(student)); } });
  const remove = useMutation({ mutationFn: () => api.delete(`/admin/students/${selectedId}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); setSelectedId(""); setForm(emptyForm()); } });
  const lifecycle = useMutation({ mutationFn: (action: "activate" | "deactivate" | "restore" | "force-logout") => api.post(`/admin/students/${selectedId}/${action}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }) });
  const resetPassword = useMutation({ mutationFn: () => api.post(`/admin/students/${selectedId}/reset-password`, { password: form.password }), onSuccess: () => setForm((current) => ({ ...current, password: "" })) });
  const filtered = useMemo(() => students.filter((s) => [s.name, s.id, s.user?.username, s.grade, s.major].filter(Boolean).join(" ").includes(search)), [search, students]);
  const selected = useMemo(() => students.find((student) => student.id === selectedId) ?? filtered[0] ?? null, [filtered, selectedId, students]);
  const overview = useQuery({ queryKey: ["student-overview", selectedId], enabled: !!selectedId, queryFn: () => api.get<Record<string, unknown>>(`/admin/students/${selectedId}/overview`) });
  const learning = useQuery({ queryKey: ["student-learning", selectedId], enabled: !!selectedId, queryFn: () => api.get<unknown[]>(`/admin/students/${selectedId}/learning`) });
  const attempts = useQuery({ queryKey: ["student-attempts", selectedId], enabled: !!selectedId, queryFn: () => api.get<unknown[]>(`/admin/students/${selectedId}/attempts`) });
  const weekly = useQuery({ queryKey: ["student-weekly", selectedId], enabled: !!selectedId, queryFn: () => api.get<Record<string, unknown>>(`/admin/students/${selectedId}/progress/weekly`) });
  const topics = useQuery({ queryKey: ["student-topics", selectedId], enabled: !!selectedId, queryFn: () => api.get<unknown[]>(`/admin/students/${selectedId}/performance/topics?limit=8`) });

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
    if (selected) setForm(fromStudent(selected));
  }, [selected?.id]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black">دانش‌آموزان</h2>
          <p className="text-slate-500">مدیریت کامل حساب، پروفایل و دسترسی به همه بخش‌های دانش‌آموز</p>
        </div>
        <Button variant="soft" onClick={() => { setSelectedId(""); setForm(emptyForm()); }}><UserPlus size={16} />دانش‌آموز جدید</Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <Input placeholder="جستجوی نام، شناسه، نام کاربری، پایه" value={search} onChange={(e) => setSearch(e.target.value)} />
            <span className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{filtered.length} دانش‌آموز</span>
          </div>
          {filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-right text-slate-500"><th className="py-2">نام</th><th>نام کاربری</th><th>پایه/رشته</th><th>هدف</th><th>ظرفیت</th><th></th></tr></thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className={`border-b last:border-0 ${selectedId === s.id ? "bg-teal-50" : ""}`}>
                      <td className="py-3 font-semibold">{s.name}</td>
                      <td>{s.user?.username || s.username || "-"}</td>
                      <td>{[s.grade, s.major].filter(Boolean).join(" / ") || "-"}</td>
                      <td>{s.targetField || s.target_major || "-"} {s.targetUniversity || s.target_city || ""}</td>
                      <td>{s.daily_capacity || s.dailyCapacity || "-"}</td>
                      <td><Button variant="ghost" onClick={() => { setSelectedId(s.id); setForm(fromStudent(s)); }}><Edit3 size={15} />ویرایش</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="دانش‌آموزی پیدا نشد." />}
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Edit3 size={18} />
            <h3 className="font-bold">{selectedId ? "ویرایش دانش‌آموز" : "دانش‌آموز جدید"}</h3>
          </div>
          <div className="grid gap-3">
            <Field label="نام"><Input value={form.name} onChange={(event) => setField("name", event.target.value)} /></Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="نام کاربری"><Input value={form.username} onChange={(event) => setField("username", event.target.value)} /></Field>
              <Field label={selectedId ? "رمز جدید (حداقل ۸ نویسه)" : "رمز"}><Input type="password" value={form.password} onChange={(event) => setField("password", event.target.value)} placeholder={selectedId ? "با دکمه تغییر رمز ثبت می‌شود" : ""} /></Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="پایه"><Input value={form.grade} onChange={(event) => setField("grade", event.target.value)} /></Field>
              <Field label="رشته"><Input value={form.major} onChange={(event) => setField("major", event.target.value)} /></Field>
            </div>
            <Field label="دانشگاه هدف"><Input value={form.targetUniversity} onChange={(event) => setField("targetUniversity", event.target.value)} /></Field>
            <Field label="رشته هدف"><Input value={form.targetField} onChange={(event) => setField("targetField", event.target.value)} /></Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="رتبه هدف"><Input value={form.targetRank} onChange={(event) => setField("targetRank", event.target.value)} /></Field>
              <Field label="ظرفیت روزانه"><Input value={form.dailyCapacity} onChange={(event) => setField("dailyCapacity", event.target.value)} /></Field>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <Button disabled={!form.name.trim() || !form.username.trim() || create.isPending || update.isPending} onClick={() => selectedId ? update.mutate() : create.mutate(form)}><Save size={16} />{selectedId ? "ذخیره تغییرات" : "ساخت دانش‌آموز"}</Button>
              <Button variant="danger" disabled={!selectedId || remove.isPending} onClick={() => void modal.confirm({ title: "بایگانی دانش‌آموز؟", description: "حساب غیرفعال می‌شود اما تاریخچه برای بازیابی حفظ خواهد شد.", tone: "danger", confirmLabel: "بایگانی" }).then((confirmed) => confirmed && remove.mutate())}><Trash2 size={16} />حذف</Button>
            </div>
            {selectedId ? <div className="grid gap-2 border-t pt-3 md:grid-cols-2"><Button variant="soft" disabled={form.password.length < 8 || resetPassword.isPending} onClick={() => resetPassword.mutate()}><KeyRound size={16} />تغییر رمز</Button><Button variant="soft" disabled={lifecycle.isPending} onClick={() => lifecycle.mutate("force-logout")}><LogOut size={16} />خروج اجباری</Button>{selected?.account_status === "archived" ? <Button onClick={() => lifecycle.mutate("restore")}><ArchiveRestore size={16} />بازیابی حساب</Button> : <Button variant="soft" onClick={() => lifecycle.mutate(selected?.account_status === "inactive" || selected?.active === false ? "activate" : "deactivate")}><Power size={16} />{selected?.account_status === "inactive" || selected?.active === false ? "فعال‌سازی" : "غیرفعال‌سازی"}</Button>}</div> : null}
          </div>
        </Card>
      </section>

      {selectedId ? <Card><h3 className="mb-3 font-bold">تصویر کامل دانش‌آموز</h3><div className="grid gap-3 md:grid-cols-5"><Insight label="گزارش اخیر" value={count(overview.data?.recentReports)} /><Insight label="موارد یادگیری" value={count(learning.data)} /><Insight label="تلاش آزمون" value={count(attempts.data)} /><Insight label="روزهای هفتگی" value={count(weekly.data)} /><Insight label="موضوع عملکرد" value={count(topics.data)} /></div></Card> : null}

      <Card>
        <h3 className="mb-3 font-bold">دسترسی مدیریت</h3>
        <div className="grid gap-2 md:grid-cols-6">
          <Link className="rounded-md bg-slate-50 p-3 text-center text-sm font-semibold hover:bg-teal-50" to="/admin/planner">برنامه‌ها</Link>
          <Link className="rounded-md bg-slate-50 p-3 text-center text-sm font-semibold hover:bg-teal-50" to="/admin/exams">آزمون‌ها</Link>
          <Link className="rounded-md bg-slate-50 p-3 text-center text-sm font-semibold hover:bg-teal-50" to="/admin/questions">بانک سؤال</Link>
          <Link className="rounded-md bg-slate-50 p-3 text-center text-sm font-semibold hover:bg-teal-50" to="/admin/chat"><MessageCircle className="mx-auto mb-1" size={16} />گفتگو</Link>
          <Link className="rounded-md bg-slate-50 p-3 text-center text-sm font-semibold hover:bg-teal-50" to="/admin/reports">گزارش‌ها</Link>
          <Link className="rounded-md bg-slate-50 p-3 text-center text-sm font-semibold hover:bg-teal-50" to="/admin/dashboard">داشبورد</Link>
        </div>
      </Card>
    </div>
  );

  function setField(key: keyof StudentForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }
}

function Insight({ label, value }: { label: string; value: number }) { return <div className="rounded-md bg-slate-50 p-3 text-center"><span className="block text-xs text-slate-500">{label}</span><strong className="mt-1 block text-xl">{value}</strong></div>; }
function count(value: unknown) { if (Array.isArray(value)) return value.length; if (value && typeof value === "object") return Object.keys(value).length; return 0; }

function emptyForm(): StudentForm {
  return { name: "", username: "", password: "", grade: "", major: "", targetUniversity: "", targetField: "", targetRank: "", dailyCapacity: "" };
}

function fromStudent(student: Student): StudentForm {
  return {
    name: student.name || "",
    username: student.user?.username || student.username || "",
    password: "",
    grade: student.grade || "",
    major: student.major || "",
    targetUniversity: student.targetUniversity || "",
    targetField: student.targetField || student.target_major || "",
    targetRank: student.targetRank || student.rank_goal || "",
    dailyCapacity: student.dailyCapacity || student.daily_capacity || "",
  };
}

function cleanPayload(form: StudentForm, includePassword: boolean) {
  return {
    name: form.name.trim(),
    username: form.username.trim(),
    ...(includePassword ? { password: form.password.trim() || "12345678" } : {}),
    grade: form.grade.trim(),
    major: form.major.trim(),
    targetUniversity: form.targetUniversity.trim(),
    targetField: form.targetField.trim(),
    targetRank: form.targetRank.trim(),
    dailyCapacity: form.dailyCapacity.trim(),
  };
}
