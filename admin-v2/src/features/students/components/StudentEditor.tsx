import { RotateCcw, Save, UserPlus, X } from "lucide-react";
import { useMemo } from "react";
import { Button, Field, Input } from "../../../shared/ui/ui";
import type { StudentForm } from "../model/student-form";

export type StudentEditorMode = "empty" | "create" | "edit";
export type StudentEditorFeedback = { tone: "success" | "error" | "info"; message: string } | null;

function formCompleteness(form: StudentForm, includePassword: boolean) {
  const values = [form.name, form.username, form.grade, form.major, form.targetUniversity, form.targetField, form.targetRank, form.dailyCapacity, ...(includePassword ? [form.password] : [])];
  return Math.round((values.filter((value) => value.trim()).length / values.length) * 100);
}

function Progress({ value }: { value: number }) {
  return <div>
    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400"><span>تکمیل اطلاعات</span><strong className="text-slate-700 dark:text-slate-200">٪{value.toLocaleString("fa-IR")}</strong></div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-label="تکمیل اطلاعات" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span className="block h-full rounded-full bg-brand transition-[width] motion-reduce:transition-none" style={{ width: `${value}%` }} /></div>
  </div>;
}

export function StudentEditor({
  mode,
  form,
  setField,
  onSave,
  onReset,
  onCancelCreate,
  busy,
  dirty,
  saveDirty,
  usernameError,
}: {
  mode: Exclude<StudentEditorMode, "empty">;
  form: StudentForm;
  setField: (key: keyof StudentForm, value: string) => void;
  onSave: () => void;
  onReset: () => void;
  onCancelCreate?: () => void;
  busy: boolean;
  dirty: boolean;
  saveDirty: boolean;
  usernameError?: string;
}) {
  const passwordValid = mode !== "create" || form.password.length >= 8;
  const baseValid = !!form.name.trim() && !!form.username.trim();
  const saveDisabled = !baseValid || busy || !saveDirty || !passwordValid || !!usernameError;
  const completion = useMemo(() => formCompleteness(form, mode === "create"), [form, mode]);

  return <section className="grid gap-5">
    {mode === "create" ? <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg bg-brand text-white"><UserPlus size={17} /></span><h3 className="font-black text-ink">ساخت دانش‌آموز جدید</h3></div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">اطلاعات ضروری را وارد کنید؛ سایر اطلاعات را می‌توان بعداً تکمیل کرد.</p></div>
      {onCancelCreate ? <Button variant="ghost" className="h-9 px-2.5" onClick={onCancelCreate}><X size={15} />انصراف</Button> : null}
    </div> : <div><h3 className="text-sm font-black text-ink">ویرایش پروفایل</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">تغییرات پروفایل مستقل از تنظیمات امنیتی ذخیره می‌شوند.</p></div>}

    <Progress value={completion} />

    <section className="grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div><h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">اطلاعات حساب</h4><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">مشخصات اصلی حساب دانش‌آموز</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نام"><Input autoFocus={mode === "create"} value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="نام و نام خانوادگی" /></Field>
        <Field label="نام کاربری" error={usernameError}><Input dir="ltr" autoComplete="off" spellCheck={false} value={form.username} onChange={(event) => setField("username", event.target.value)} placeholder="username" /></Field>
      </div>
      {mode === "create" ? <Field label="رمز عبور" error={form.password && form.password.length < 8 ? "رمز عبور باید حداقل ۸ نویسه باشد." : undefined}><Input dir="ltr" autoComplete="new-password" type="password" value={form.password} onChange={(event) => setField("password", event.target.value)} placeholder="حداقل ۸ نویسه" /></Field> : null}
    </section>

    <section className="grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div><h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">وضعیت تحصیلی</h4><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">اطلاعات مورد استفاده در برنامه‌ریزی و گزارش‌ها</p></div>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="پایه"><Input value={form.grade} onChange={(event) => setField("grade", event.target.value)} placeholder="مثلاً دوازدهم" /></Field><Field label="رشته"><Input value={form.major} onChange={(event) => setField("major", event.target.value)} placeholder="مثلاً تجربی" /></Field></div>
    </section>

    <section className="grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div><h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">هدف و ظرفیت</h4><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">هدف دانشگاهی و ظرفیت برنامه‌ریزی روزانه</p></div>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="دانشگاه هدف"><Input value={form.targetUniversity} onChange={(event) => setField("targetUniversity", event.target.value)} placeholder="دانشگاه هدف" /></Field><Field label="رشته هدف"><Input value={form.targetField} onChange={(event) => setField("targetField", event.target.value)} placeholder="رشته هدف" /></Field></div>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="رتبه هدف"><Input dir="ltr" inputMode="numeric" value={form.targetRank} onChange={(event) => setField("targetRank", event.target.value)} placeholder="مثلاً 1500" /></Field><Field label="ظرفیت روزانه"><Input value={form.dailyCapacity} onChange={(event) => setField("dailyCapacity", event.target.value)} placeholder="مثلاً 6 ساعت" /></Field></div>
    </section>

    <div className="sticky bottom-2 z-10 grid gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur sm:grid-cols-[minmax(0,1fr)_auto] dark:border-slate-800 dark:bg-slate-950/95">
      <Button loading={busy} loadingLabel={mode === "create" ? "در حال ساخت..." : "در حال ذخیره..."} disabled={saveDisabled} onClick={onSave}><Save size={16} />{mode === "create" ? "ساخت دانش‌آموز" : "ذخیره تغییرات"}</Button>
      <Button variant="soft" disabled={!dirty || busy} onClick={onReset}><RotateCcw size={16} />بازنشانی</Button>
    </div>
  </section>;
}
