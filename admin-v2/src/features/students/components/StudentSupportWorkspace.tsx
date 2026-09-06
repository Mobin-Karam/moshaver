import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BrainCircuit, Lightbulb, RefreshCw } from "lucide-react";
import { useAuth } from "../../auth";
import { Button, Card, EmptyState, Field, Input, Textarea } from "../../../shared/ui/ui";
import { createStudentRecommendation, getStudentAnalytics, getStudentMistakes, getStudentRecommendations } from "../api/students.api";

const number = (value: number | null | undefined, suffix = "") => value == null ? "—" : `${value.toLocaleString("fa-IR")}${suffix}`;

export function StudentSupportWorkspace({ studentId }: { studentId: string }) {
  const auth = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ title: "", reason: "", type: "FOLLOW_UP" });
  const analytics = useQuery({ queryKey: ["student-analytics", studentId], queryFn: () => getStudentAnalytics(studentId) });
  const recommendations = useQuery({ queryKey: ["student-recommendations", studentId], queryFn: () => getStudentRecommendations(studentId), enabled: auth.can("recommendations.read") });
  const mistakes = useQuery({ queryKey: ["student-mistakes", studentId], queryFn: () => getStudentMistakes(studentId), enabled: auth.can("mistakes.read") });
  const create = useMutation({
    mutationFn: () => createStudentRecommendation(studentId, { ...draft, evidence: {} }),
    onSuccess: async () => { setDraft({ title: "", reason: "", type: "FOLLOW_UP" }); await qc.invalidateQueries({ queryKey: ["student-recommendations", studentId] }); },
  });
  const failed = analytics.isError || recommendations.isError || mistakes.isError;
  const retry = () => { void analytics.refetch(); if (auth.can("recommendations.read")) void recommendations.refetch(); if (auth.can("mistakes.read")) void mistakes.refetch(); };

  return <section className="mt-4 grid gap-3" aria-labelledby="support-heading">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="support-heading" className="text-sm font-black text-ink">مرکز تحلیل و پیگیری</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">تحلیل عملکرد، خطاهای نیازمند مرور و پیشنهادهای تیم آموزشی</p></div>{failed?<Button variant="ghost" className="h-8 px-2.5 text-xs" onClick={retry}><RefreshCw size={14}/>تلاش دوباره</Button>:null}</div>
    {analytics.isLoading?<div className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"/>:analytics.isError?<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">تحلیل عملکرد دریافت نشد.</div>:<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{[
      ["تکمیل برنامه",number(analytics.data?.planCompletion,"٪")],["زمان مطالعه",number(analytics.data?.studyDurationMinutes," دقیقه")],["میانگین آزمون",number(analytics.data?.examPerformance)],["دقت پاسخ",number(analytics.data?.questionAccuracy,"٪")]
    ].map(([label,value])=><div key={label} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60"><span className="text-xs text-slate-500">{label}</span><strong className="mt-2 block text-xl text-ink">{value}</strong></div>)}</div>}
    <div className="grid gap-3 xl:grid-cols-2">
      {auth.can("mistakes.read")?<Card className="p-3"><div className="mb-3 flex items-center gap-2"><AlertTriangle size={17} className="text-amber-600"/><h4 className="font-bold">خطاهای نیازمند مرور</h4></div>{mistakes.isLoading?<div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"/>:mistakes.isError?<p role="alert" className="text-sm text-rose-700">دریافت خطاها ناموفق بود.</p>:!mistakes.data?.length?<EmptyState title="خطای ثبت‌شده‌ای وجود ندارد."/>:<div className="grid gap-2">{mistakes.data.map(item=><div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"><div className="flex justify-between gap-2"><strong>سؤال {item.questionId}</strong><span className={item.resolved?"text-emerald-600":"text-amber-700"}>{item.resolved?"مرور شده":"باز"}</span></div><p className="mt-1 text-slate-500">{item.reason||"دلیل هنوز ثبت نشده است."}</p></div>)}</div>}</Card>:null}
      {auth.can("recommendations.read")?<Card className="p-3"><div className="mb-3 flex items-center gap-2"><Lightbulb size={17} className="text-brand"/><h4 className="font-bold">پیشنهادهای آموزشی</h4></div>{recommendations.isLoading?<div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"/>:recommendations.isError?<p role="alert" className="text-sm text-rose-700">دریافت پیشنهادها ناموفق بود.</p>:!recommendations.data?.length?<EmptyState title="هنوز پیشنهادی ثبت نشده است."/>:<div className="grid gap-2">{recommendations.data.map(item=><div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"><div className="flex justify-between gap-2"><strong>{item.title}</strong><span className="text-xs text-slate-500">{item.status}</span></div><p className="mt-1 text-slate-500">{item.reason}</p></div>)}</div>}
        {auth.can("recommendations.manage")?<form className="mt-4 grid gap-2 border-t border-slate-200 pt-3 dark:border-slate-800" onSubmit={e=>{e.preventDefault();create.mutate();}}><div className="flex items-center gap-2"><BrainCircuit size={16}/><strong className="text-sm">پیشنهاد جدید</strong></div><Field label="عنوان"><Input required maxLength={240} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></Field><Field label="دلیل"><Textarea required maxLength={1000} rows={3} value={draft.reason} onChange={e=>setDraft({...draft,reason:e.target.value})}/></Field>{create.isError?<p role="alert" className="text-sm text-rose-700">ثبت پیشنهاد ناموفق بود.</p>:null}<Button loading={create.isPending} disabled={!draft.title.trim()||!draft.reason.trim()}>ثبت پیشنهاد</Button></form>:null}</Card>:null}
    </div>
  </section>;
}
