import { AlertTriangle, Check, ChevronDown, Search, UserRound, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Student } from "../types/domain";
import { cn, normalizePersianText } from "../lib/utils";
import { ViewportPopover } from "./popover";

const RECENT_KEY = "admin-recent-student-ids";
type Filter = "all" | "attention" | "active" | "inactive";

export function StudentPicker({ students, value, onChange }: { students: Student[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState(""), [filter, setFilter] = useState<Filter>("all"), [expanded, setExpanded] = useState(false);
  const selected = students.find((student) => student.id === value) || null;
  const recentIds = readRecentIds();
  const recent = recentIds.flatMap((id) => students.find((student) => student.id === id) || []);
  const filtered = useMemo(() => {
    const term = normalizePersianText(query);
    return students.filter((student) => {
      const searchable = normalizePersianText([student.name, student.username, student.user?.username, student.grade, student.major, student.targetField, student.target_major].filter(Boolean).join(" "));
      const risk = Number(student.due_learning_count || 0) > 0 || (student.average_percent != null && Number(student.average_percent) < 50);
      const active = student.account_status !== "inactive" && student.account_status !== "archived" && student.active !== false && student.active !== 0;
      return (!term || searchable.includes(term)) && (filter === "all" || filter === "attention" && risk || filter === "active" && active || filter === "inactive" && !active);
    });
  }, [filter, query, students]);
  const visible = expanded ? filtered : filtered.slice(0, 40);

  function choose(id: string) {
    writeRecentId(id);
    onChange(id);
    setOpen(false);
    setQuery("");
    setExpanded(false);
  }

  return <ViewportPopover open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setQuery(""); setExpanded(false); } }} width={380} className="overflow-hidden" trigger={(props) => <button {...props} type="button" className="flex h-10 w-full min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-right outline-none transition hover:border-slate-300 focus:border-brand focus:ring-2 focus:ring-indigo-100" aria-label={selected ? `دانش‌آموز انتخاب‌شده: ${selected.name}` : "انتخاب دانش‌آموز"}>
    <StudentAvatar student={selected} />
    <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{selected?.name || (students.length ? "انتخاب دانش‌آموز" : "دانش‌آموزی وجود ندارد")}</strong>{selected ? <small className="block truncate text-[10px] text-slate-400">{[selected.grade, selected.major].filter(Boolean).join(" · ") || selected.user?.username || selected.username || "پروفایل آموزشی"}</small> : null}</span>
    {selected && hasAttention(selected) ? <span className="size-2 shrink-0 rounded-full bg-rose-500" title="نیازمند توجه" /> : null}<ChevronDown size={15} className="shrink-0 text-slate-400" />
  </button>}>
    <div className="border-b p-3"><div className="mb-2 flex items-center justify-between gap-2"><div><strong className="text-sm">انتخاب دانش‌آموز</strong><p className="text-[11px] text-slate-500">{students.length.toLocaleString("fa-IR")} حساب در دسترس</p></div>{value ? <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="بستن انتخابگر" onClick={() => setOpen(false)}><X size={17} /></button> : null}</div><label className="flex h-10 items-center gap-2 rounded-md border bg-slate-50 px-3"><Search size={16} className="text-slate-400" /><input autoFocus className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={query} onChange={(event) => { setQuery(event.target.value); setExpanded(false); }} placeholder="نام، نام کاربری، پایه یا رشته…" /></label><div className="mt-2 flex gap-1 overflow-x-auto" role="group" aria-label="فیلتر دانش‌آموزان">{([['all','همه'],['attention','نیازمند توجه'],['active','فعال'],['inactive','غیرفعال']] as Array<[Filter,string]>).map(([key, label]) => <button type="button" key={key} aria-pressed={filter === key} className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${filter === key ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`} onClick={() => { setFilter(key); setExpanded(false); }}>{label}</button>)}</div></div>
    {!query && filter === "all" && recent.length ? <section className="border-b bg-slate-50/70 p-2"><p className="mb-1 px-1 text-[10px] font-bold text-slate-400">اخیراً انتخاب‌شده</p><div className="flex gap-1 overflow-x-auto">{recent.slice(0, 5).map((student) => <button type="button" key={student.id} className="flex shrink-0 items-center gap-1.5 rounded-md bg-white px-2 py-1.5 text-xs ring-1 ring-slate-200 hover:ring-indigo-300" onClick={() => choose(student.id)}><StudentAvatar student={student} small /> <span className="max-w-24 truncate">{student.name}</span></button>)}</div></section> : null}
    <div className="max-h-80 overflow-y-auto overscroll-contain p-2" role="listbox" aria-label="فهرست دانش‌آموزان">{visible.length ? visible.map((student) => <StudentOption key={student.id} student={student} selected={student.id === value} onClick={() => choose(student.id)} />) : <div className="grid min-h-28 place-items-center px-4 text-center text-sm text-slate-500"><span><UsersRound className="mx-auto mb-2" size={24} />دانش‌آموزی با این جستجو یا فیلتر پیدا نشد.</span></div>}{!expanded && filtered.length > visible.length ? <button type="button" className="mt-1 w-full rounded-md bg-slate-50 py-2 text-xs font-bold text-brand hover:bg-indigo-50" onClick={() => setExpanded(true)}>نمایش {filtered.length.toLocaleString("fa-IR")} دانش‌آموز</button> : null}</div>
  </ViewportPopover>;
}

function StudentOption({ student, selected, onClick }: { student: Student; selected: boolean; onClick: () => void }) {
  const attention = hasAttention(student), inactive = student.account_status === "inactive" || student.account_status === "archived" || student.active === false || student.active === 0;
  return <button type="button" role="option" aria-selected={selected} className={cn("mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-right transition last:mb-0", selected ? "bg-indigo-50 text-brand" : "hover:bg-slate-50")} onClick={onClick}><StudentAvatar student={student} /><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{student.name}</strong><small className="block truncate text-[10px] text-slate-400">{[student.user?.username || student.username, student.grade, student.major].filter(Boolean).join(" · ") || "بدون جزئیات"}</small></span>{attention ? <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700"><AlertTriangle size={11} /> {Number(student.due_learning_count || 0) ? `${Number(student.due_learning_count).toLocaleString("fa-IR")} مرور` : "ریسک"}</span> : inactive ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500">غیرفعال</span> : null}{selected ? <Check size={16} className="shrink-0" /> : null}</button>;
}
function StudentAvatar({ student, small = false }: { student: Student | null; small?: boolean }) { return <span className={cn("grid shrink-0 place-items-center rounded-full bg-sky-50 font-black text-sky-700", small ? "size-6 text-[10px]" : "size-8 text-xs")}>{student?.name?.trim()?.[0] || <UserRound size={small ? 12 : 15} />}</span>; }
function hasAttention(student: Student) { return Number(student.due_learning_count || 0) > 0 || student.average_percent != null && Number(student.average_percent) < 50; }
function readRecentIds(): string[] { if (typeof window === "undefined") return []; try { const value = JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]"); return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; } catch { return []; } }
function writeRecentId(id: string) { if (typeof window === "undefined") return; window.localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecentIds().filter((item) => item !== id)].slice(0, 5))); }
