import { GraduationCap } from 'lucide-react';
import { useStudentStore } from '../../services/student-store';

export function ExamPage() {
  const exams = useStudentStore((state) => state.exams);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">آزمون</h1>
      {exams.length ? (
        exams.map((exam) => (
          <article key={exam.id} className="surface p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-saffron/15 text-saffron">
                <GraduationCap size={22} />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold">{exam.title}</h2>
                <p className="mt-1 text-sm text-ink/65">
                  {exam.durationMinutes || 0} دقیقه | {exam.delivery?.questionCount || 0} سوال | {exam.maxAttempts || 1} تلاش
                </p>
              </div>
            </div>
          </article>
        ))
      ) : (
        <article className="surface p-4 text-sm text-ink/60">آزمونی در backend-v2 ثبت نشده است.</article>
      )}
    </section>
  );
}
