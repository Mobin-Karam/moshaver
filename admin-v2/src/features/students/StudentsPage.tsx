import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit3, MessageCircle, Save, Trash2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, EmptyState, Field, Input, Button } from "../../components/ui";
import { useStudents } from "../../hooks/useStudents";
import { api } from "../../services/api";
import type { Student } from "../../types/domain";

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
  const create = useMutation({ mutationFn: (body: StudentForm) => api.post<Student>("/admin/students", cleanPayload(body, true)), onSuccess: (student) => { qc.invalidateQueries({ queryKey: ["students"] }); setSelectedId(student.id); setForm(fromStudent(student)); } });
  const update = useMutation({ mutationFn: () => api.patch<Student>(`/admin/students/${selectedId}`, cleanPayload(form, false)), onSuccess: (student) => { qc.invalidateQueries({ queryKey: ["students"] }); setForm(fromStudent(student)); } });
  const remove = useMutation({ mutationFn: () => api.delete(`/admin/students/${selectedId}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); setSelectedId(""); setForm(emptyForm()); } });
  const filtered = useMemo(() => students.filter((s) => [s.name, s.id, s.user?.username, s.grade, s.major].filter(Boolean).join(" ").includes(search)), [search, students]);
  const selected = useMemo(() => students.find((student) => student.id === selectedId) ?? filtered[0] ?? null, [filtered, selectedId, students]);

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
                      <td>{s.user?.username || "-"}</td>
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
              <Field label={selectedId ? "رمز جدید" : "رمز"}><Input type="password" value={form.password} onChange={(event) => setField("password", event.target.value)} placeholder={selectedId ? "خالی = بدون تغییر" : ""} /></Field>
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
              <Button variant="danger" disabled={!selectedId || remove.isPending} onClick={() => window.confirm("دانش‌آموز حذف شود؟") && remove.mutate()}><Trash2 size={16} />حذف</Button>
            </div>
          </div>
        </Card>
      </section>

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

function emptyForm(): StudentForm {
  return { name: "", username: "", password: "", grade: "", major: "", targetUniversity: "", targetField: "", targetRank: "", dailyCapacity: "" };
}

function fromStudent(student: Student): StudentForm {
  return {
    name: student.name || "",
    username: student.user?.username || "",
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
    ...(includePassword || form.password.trim() ? { password: form.password.trim() || "12345678" } : {}),
    grade: form.grade.trim(),
    major: form.major.trim(),
    targetUniversity: form.targetUniversity.trim(),
    targetField: form.targetField.trim(),
    targetRank: form.targetRank.trim(),
    dailyCapacity: form.dailyCapacity.trim(),
  };
}
