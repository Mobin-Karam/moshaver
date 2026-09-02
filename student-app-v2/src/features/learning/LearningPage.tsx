import { AlertCircle, ArrowRight, BookOpenCheck, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useStudentStore } from '../../services/student-store';

export function LearningPage() {
  const progress = useStudentStore((state) => state.progress);
  const reviews = useStudentStore((state) => state.reviews);
  const status = useStudentStore((state) => state.learningLoadStatus);
  const error = useStudentStore((state) => state.learningError);
  const loadLearning = useStudentStore((state) => state.loadLearning);

  useEffect(() => {
    void loadLearning();
  }, [loadLearning]);

  return (
    <section className="space-y-4">
      <Link to="/more" className="flex items-center gap-2 text-sm text-ink/65">
        <ArrowRight size={16} />
        بازگشت به بیشتر
      </Link>
      <div>
        <span className="text-xs text-ink/60">نمای کلی یادگیری</span>
        <h1 className="mt-1 text-2xl font-semibold">پیشرفت و مرور</h1>
      </div>

      {status === 'loading' ? <LoadingState /> : null}
      {status === 'error' ? (
        <article className="surface p-4" role="alert">
          <div className="flex items-start gap-3 text-red-700">
            <AlertCircle className="mt-1 shrink-0" size={20} />
            <div>
              <h2 className="font-semibold">دریافت اطلاعات انجام نشد</h2>
              <p className="mt-1 text-sm">{error || 'درخواست ناموفق بود.'}</p>
            </div>
          </div>
          <button type="button" className="mt-4 flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm text-white" onClick={() => void loadLearning()}>
            <RefreshCw size={16} />
            تلاش دوباره
          </button>
        </article>
      ) : null}

      {status === 'ready' ? (
        <>
          <article className="surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">پیشرفت برنامه امروز</h2>
                <p className="mt-1 text-sm text-ink/60">کارهای تکمیل‌شده از مجموع برنامه</p>
              </div>
              <strong className="text-3xl text-mint">{progress?.percent ?? 0}%</strong>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-paper" aria-label={`پیشرفت ${progress?.percent ?? 0} درصد`}>
              <div className="h-full rounded-full bg-mint transition-all" style={{ width: `${Math.min(100, Math.max(0, progress?.percent ?? 0))}%` }} />
            </div>
            <p className="mt-2 text-sm text-ink/65">{progress?.completed ?? 0} از {progress?.total ?? 0} کار</p>
          </article>

          <article className="surface p-4">
            <div className="flex items-center gap-2">
              <BookOpenCheck size={19} className="text-saffron" />
              <h2 className="font-semibold">مرورهای ثبت‌شده</h2>
            </div>
            {reviews.length ? (
              <div className="mt-3 space-y-2">
                {reviews.map((review, index) => (
                  <div key={review.id ?? `${review.title}-${index}`} className="rounded-md bg-paper px-3 py-3">
                    <strong className="block">{review.title || 'مرور'}</strong>
                    {review.subject ? <span className="mt-1 block text-sm text-ink/65">{review.subject}</span> : null}
                    {review.note ? <p className="mt-1 text-sm text-ink/65">{review.note}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-md bg-paper px-3 py-3 text-sm text-ink/60">هنوز مرور ثبت‌شده‌ای برای نمایش وجود ندارد.</p>
            )}
          </article>
        </>
      ) : null}
    </section>
  );
}

function LoadingState() {
  return <div className="surface p-5 text-center text-sm text-ink/65" role="status">در حال دریافت گزارش یادگیری...</div>;
}