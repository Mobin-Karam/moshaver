import { ArrowUpLeft, CheckCircle2, Clock3, ListChecks, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/api-client';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui';
import './student-quizzes.css';

type QuizSummary = { id:string; title:string; subject?:string; durationMinutes:number; questionCount:number; attempt?:{id:string;submittedAt?:string|null;percent:number}|null };
type QuizQuestion = { id:string; text:string; options:string[] };
type QuizRun = { runId:string; deadline:string; remainingSeconds:number; savedAnswers:Array<{questionId:string;selectedOption?:string|null}>; quiz:{id:string;title:string;durationMinutes:number;questions:QuizQuestion[]} };
type QuizResult = { id:string; quizId:string; correct:number; wrong:number; blank:number; percent:number; review:Array<{questionId:string;selectedOption:string|null;correctOption:string;explanation?:string;isCorrect:boolean}> };

export function StudentQuizzesPage() {
  const [quizzes,setQuizzes]=useState<QuizSummary[]>([]);
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [revision,setRevision]=useState(0);
  const [run,setRun]=useState<QuizRun|null>(null);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [result,setResult]=useState<QuizResult|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    setStatus('loading');
    try { setQuizzes(await apiClient.request<QuizSummary[]>('GET','/student/quizzes')); setStatus('ready'); }
    catch { setStatus('error'); }
  },[]);
  useEffect(()=>{ void load(); },[load,revision]);

  async function start(id:string){
    setBusy(true);setError('');setResult(null);
    try { const next=await apiClient.request<QuizRun>('POST',`/quizzes/${encodeURIComponent(id)}/start`);setRun(next);setAnswers(Object.fromEntries(next.savedAnswers.filter(item=>item.selectedOption).map(item=>[item.questionId,item.selectedOption!]))); }
    catch(error) { setError(error instanceof Error?error.message:'شروع آزمونک ناموفق بود.'); }
    finally { setBusy(false); }
  }
  async function submit(){
    if(!run)return;setBusy(true);setError('');
    try { const value=await apiClient.request<QuizResult>('POST',`/quizzes/${encodeURIComponent(run.quiz.id)}/attempts`,{runId:run.runId,answers:run.quiz.questions.map(question=>({questionId:question.id,selectedOption:answers[question.id]||null}))});setResult(value);setRun(null);await load(); }
    catch(error) { setError(error instanceof Error?error.message:'ثبت پاسخ‌ها ناموفق بود.'); }
    finally { setBusy(false); }
  }

  return <section className="student-quizzes">
    <header className="resource-library__header"><div><small>تمرین و سنجش</small><h1>آزمونک‌ها</h1><p>تمرین‌های کوتاه منتشرشده برای شما</p></div><Link to="/more" aria-label="بازگشت به بیشتر"><ArrowUpLeft /></Link></header>
    {error?<div className="quiz-inline-error" role="alert">{error}</div>:null}
    {run?<QuizRunner run={run} answers={answers} setAnswers={setAnswers} busy={busy} onSubmit={()=>void submit()} onCancel={()=>setRun(null)}/>:null}
    {result?<QuizResultPanel result={result} onClose={()=>setResult(null)}/>:null}
    {!run&&!result&&status==='loading'?<LoadingState label="در حال دریافت آزمونک‌ها"/>:null}
    {!run&&!result&&status==='error'?<ErrorState message="دریافت آزمونک‌ها ناموفق بود." onRetry={()=>setRevision(value=>value+1)}/>:null}
    {!run&&!result&&status==='ready'&&!quizzes.length?<EmptyState title="آزمونک فعالی برای شما وجود ندارد."/>:null}
    {!run&&!result&&status==='ready'&&quizzes.length?<div className="student-quizzes__list">{quizzes.map(quiz=><article key={quiz.id} className="student-quiz-card"><span><ListChecks aria-hidden="true"/></span><div><small>{quiz.subject||'آزمونک عمومی'}</small><h2>{quiz.title}</h2><p><Clock3 aria-hidden="true"/>{quiz.durationMinutes.toLocaleString('fa-IR')} دقیقه · {quiz.questionCount.toLocaleString('fa-IR')} سؤال</p>{quiz.attempt?.submittedAt?<strong><CheckCircle2 aria-hidden="true"/>آخرین نتیجه: {quiz.attempt.percent.toLocaleString('fa-IR')}٪</strong>:null}</div><button disabled={busy||!quiz.questionCount} onClick={()=>void start(quiz.id)}>{quiz.attempt?.submittedAt?<><RotateCcw/>تلاش دوباره</>:<><ListChecks/>شروع</>}</button></article>)}</div>:null}
  </section>;
}

function QuizRunner({run,answers,setAnswers,busy,onSubmit,onCancel}:{run:QuizRun;answers:Record<string,string>;setAnswers(value:Record<string,string>):void;busy:boolean;onSubmit():void;onCancel():void}){
  const [remaining,setRemaining]=useState(run.remainingSeconds);
  const submitted=useRef(false);
  const submitRef=useRef(onSubmit);
  useEffect(()=>{submitRef.current=onSubmit;},[onSubmit]);
  useEffect(()=>{const timer=window.setInterval(()=>setRemaining(value=>Math.max(0,value-1)),1000);return()=>window.clearInterval(timer);},[]);
  useEffect(()=>{if(remaining<=1&&!submitted.current){submitted.current=true;submitRef.current();}},[remaining]);
  return <section className="student-quiz-run" aria-labelledby="quiz-run-title"><header><div><small>در حال پاسخ‌گویی</small><h2 id="quiz-run-title">{run.quiz.title}</h2></div><div className="student-quiz-timer" role="timer" aria-label="زمان باقی‌مانده"><Clock3 aria-hidden="true"/><strong dir="ltr">{formatTime(remaining)}</strong></div><button onClick={onCancel}>خروج</button></header>{run.quiz.questions.map((question,index)=><fieldset key={question.id}><legend>{(index+1).toLocaleString('fa-IR')}. {question.text}</legend>{question.options.map(option=><label key={option}><input type="radio" name={question.id} value={option} checked={answers[question.id]===option} onChange={()=>setAnswers({...answers,[question.id]:option})}/><span>{option}</span></label>)}</fieldset>)}<button className="student-quiz-submit" disabled={busy||remaining<=0} onClick={()=>{submitted.current=true;onSubmit();}}>{busy?'در حال ثبت…':'ثبت و مشاهده نتیجه'}</button></section>;
}

function QuizResultPanel({result,onClose}:{result:QuizResult;onClose():void}){
  return <section className="student-quiz-result" aria-labelledby="quiz-result-title"><CheckCircle2 aria-hidden="true"/><h2 id="quiz-result-title">نتیجه آزمونک</h2><strong>{result.percent.toLocaleString('fa-IR')}٪</strong><p>{result.correct.toLocaleString('fa-IR')} درست · {result.wrong.toLocaleString('fa-IR')} نادرست · {result.blank.toLocaleString('fa-IR')} بی‌پاسخ</p>{result.review.map((item,index)=><article key={item.questionId} className={item.isCorrect?'is-correct':'is-wrong'}><b>سؤال {(index+1).toLocaleString('fa-IR')}</b><span>پاسخ صحیح: {item.correctOption}</span>{item.explanation?<p>{item.explanation}</p>:null}</article>)}<button onClick={onClose}>بازگشت به آزمونک‌ها</button></section>;
}

function formatTime(seconds:number){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
