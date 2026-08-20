import { appendMessage, unreadCount } from '@moshaver/student-core';

const messages = appendMessage(
  [{ id: '1', conversationId: 'c1', senderUserId: 'advisor', text: 'برنامه امروز را آرام شروع کن.', createdAt: '2026-08-20T08:00:00.000Z' }],
  { id: '2', conversationId: 'c1', senderUserId: 'student', text: 'چشم، شروع کردم.', createdAt: '2026-08-20T08:03:00.000Z', seen: true },
);

export function ChatPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">مشاور</h1>
        <p className="text-sm text-ink/60">خوانده‌نشده: {unreadCount(messages, 'student')}</p>
      </div>
      <div className="surface space-y-3 p-4">
        {messages.map((message) => (
          <p key={message.id} className={`rounded-md px-3 py-2 ${message.senderUserId === 'student' ? 'bg-ink text-white' : 'bg-paper'}`}>
            {message.text}
          </p>
        ))}
      </div>
    </section>
  );
}
