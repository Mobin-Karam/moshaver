import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, EmptyState, Field, Input, Button } from "../../components/ui";
import { useStudents } from "../../hooks/useStudents";
import { api } from "../../services/api";

export function StudentsPage() {
  const [search, setSearch] = useState("");
  const { students } = useStudents();
  const qc = useQueryClient();
  const create = useMutation({ mutationFn: (body: Record<string, unknown>) => api.post("/admin/students", body), onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }) });
  const filtered = useMemo(() => students.filter((s) => s.name.includes(search) || s.id.includes(search)), [search, students]);
  return <div className="grid gap-5"><div><h2 className="text-2xl font-black">دانش‌آموزان</h2><p className="text-slate-500">فهرست، جستجو و پروفایل پایه</p></div><Card><div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]"><Input placeholder="جستجوی نام یا شناسه" value={search} onChange={(e) => setSearch(e.target.value)} /><Button onClick={() => create.mutate({ name: "دانش‌آموز جدید", username: `student_${Date.now()}`, password: "ChangeThisStudentPassword123!", active: true })}>افزودن سریع</Button></div>{filtered.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-right text-slate-500"><th className="py-2">نام</th><th>پایه</th><th>هدف</th><th>ظرفیت</th></tr></thead><tbody>{filtered.map((s) => <tr key={s.id} className="border-b last:border-0"><td className="py-3 font-semibold">{s.name}</td><td>{s.grade || s.major || "-"}</td><td>{s.target_major || "-"} {s.target_city || ""}</td><td>{s.daily_capacity || s.dailyCapacity || "-"}</td></tr>)}</tbody></table></div> : <EmptyState title="دانش‌آموزی پیدا نشد." />}</Card><Card><h3 className="mb-3 font-bold">تب‌های پروفایل</h3><div className="grid gap-2 md:grid-cols-7">{["Overview", "Plans", "Exams", "Mistakes", "Reviews", "Chat", "Reports"].map((tab) => <span key={tab} className="rounded-md bg-slate-50 p-3 text-center text-sm font-semibold">{tab}</span>)}</div></Card></div>;
}
