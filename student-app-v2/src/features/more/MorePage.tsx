import { countUnread, markNotificationRead } from '@moshaver/student-core';
import { LogOut } from 'lucide-react';
import { useStudentStore } from '../../services/student-store';

const notifications = markNotificationRead(
  [
    { id: 'n1', title: 'برنامه', body: 'برنامه جدید منتشر شد.', isRead: false },
    { id: 'n2', title: 'آزمون', body: 'پنجره آزمون امروز باز است.', isRead: false },
  ],
  'n1',
);

export function MorePage() {
  const student = useStudentStore((state) => state.student);
  const user = useStudentStore((state) => state.user);
  const syncStatus = useStudentStore((state) => state.syncStatus);
  const logout = useStudentStore((state) => state.logout);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">بیشتر</h1>
      <article className="surface p-4">
        <h2 className="font-semibold">{student?.name || user?.username || 'دانش‌آموز'}</h2>
        <p className="mt-2 text-sm text-ink/65">{[student?.grade, student?.major].filter(Boolean).join(' | ') || 'پرونده دانش‌آموز'}</p>
      </article>
      <article className="surface p-4">
        <h2 className="font-semibold">اعلان‌ها</h2>
        <p className="mt-2 text-sm text-ink/65">خوانده‌نشده: {countUnread(notifications)}</p>
      </article>
      <article className="surface p-4">
        <h2 className="font-semibold">ذخیره‌سازی و همگام‌سازی</h2>
        <p className="mt-2 text-sm text-ink/65">وضعیت: {syncStatus}</p>
      </article>
      <button className="flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-white" onClick={() => void logout()}>
        <LogOut size={18} />
        خروج
      </button>
    </section>
  );
}
