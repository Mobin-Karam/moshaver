import { useEffect } from 'react';
import { useStudentStore } from '../../services/student-store';
import { Button, EmptyState, ErrorState, LoadingState } from '../../components/ui';
import { NotificationCard } from '../../components/student';

export function NotificationsPage() {
  const items = useStudentStore((state) => state.notifications); const status = useStudentStore((state) => state.loadStatus); const error = useStudentStore((state) => state.error); const load = useStudentStore((state) => state.loadNotifications); const read = useStudentStore((state) => state.markNotificationRead); const readAll = useStudentStore((state) => state.markAllNotificationsRead);
  useEffect(() => { void load(); }, [load]);
  return <section className="page-stack"><header className="section-heading"><div><span>صندوق پیام‌های آموزشی</span><h2>اعلان‌ها</h2></div>{items.some((item) => !item.readAt) ? <Button variant="ghost" onClick={() => void readAll()}>خواندن همه</Button> : null}</header>{status === 'loading' && !items.length ? <LoadingState label="در حال دریافت اعلان‌ها" /> : null}{status === 'error' && !items.length ? <ErrorState message={error || undefined} onRetry={() => void load()} /> : null}{status !== 'loading' && !items.length ? <EmptyState title="اعلان جدیدی ندارید" description="تغییرهای برنامه و پیام‌های مهم مشاور اینجا نمایش داده می‌شود." /> : <div className="notification-list">{items.map((item) => <NotificationCard key={item.id} notification={item} onRead={() => !item.readAt && void read(item.id)} />)}</div>}</section>;
}
