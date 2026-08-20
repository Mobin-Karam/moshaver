import { Send, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../../services/api-client';

interface ChatMessage {
  id: string;
  text: string;
  senderRole: 'admin' | 'student' | 'ADMIN' | 'STUDENT';
  createdAt?: string;
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'sending' | 'error'>('loading');
  const [online, setOnline] = useState(navigator.onLine);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function loadMessages() {
    try {
      const next = await apiClient.request<ChatMessage[]>('GET', '/chat/conversations/advisor/messages');
      setMessages(next);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  async function sendMessage() {
    const value = text.trim();
    if (!value) return;
    setStatus('sending');
    setText('');
    try {
      const message = await apiClient.request<ChatMessage, { text: string }>('POST', '/chat/conversations/advisor/messages', { text: value });
      setMessages((current) => [...current, message]);
      setStatus('ready');
    } catch {
      setText(value);
      setStatus('error');
    }
  }

  useEffect(() => {
    void loadMessages();
    const timer = window.setInterval(() => void loadMessages(), 15_000);
    const source = apiClient.openEvents((type) => {
      if (type === 'chat.message') void loadMessages();
    });
    const setOnlineState = () => setOnline(navigator.onLine);
    window.addEventListener('online', setOnlineState);
    window.addEventListener('offline', setOnlineState);
    return () => {
      window.clearInterval(timer);
      source.close();
      window.removeEventListener('online', setOnlineState);
      window.removeEventListener('offline', setOnlineState);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  return (
    <section className="flex min-h-[calc(100vh-164px)] flex-col overflow-hidden rounded-md border border-black/10 bg-[#efeae2]">
      <div className="flex items-center justify-between border-b border-black/10 bg-white px-4 py-3">
        <div>
          <h1 className="text-base font-semibold">مشاور</h1>
          <p className="text-xs text-ink/60">{statusLabel(status)}</p>
        </div>
        <span className={`grid size-9 place-items-center rounded-md ${online ? 'bg-mint/15 text-mint' : 'bg-red-50 text-red-700'}`}>
          {online ? <Wifi size={18} /> : <WifiOff size={18} />}
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-auto px-3 py-4">
        {messages.length ? messages.map((message) => <Bubble key={message.id} message={message} />) : (
          <div className="mx-auto mt-8 max-w-xs rounded-md bg-white/90 px-3 py-2 text-center text-sm text-ink/60 shadow-sm">
            هنوز پیامی ثبت نشده است.
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="grid grid-cols-[1fr_44px] gap-2 border-t border-black/10 bg-white p-2"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage();
        }}
      >
        <input
          className="h-11 rounded-md border border-black/10 bg-paper px-3 outline-none focus:border-ink"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="پیام..."
        />
        <button className="grid size-11 place-items-center rounded-md bg-ink text-white disabled:opacity-50" disabled={!text.trim() || status === 'sending'} aria-label="ارسال">
          <Send size={18} />
        </button>
      </form>
    </section>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const mine = String(message.senderRole).toLowerCase() === 'student';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[78%] rounded-md px-3 py-2 text-sm shadow-sm ${mine ? 'bg-[#d9fdd3]' : 'bg-white'}`}>
        <p className="whitespace-pre-wrap leading-7">{message.text}</p>
        <span className="mt-1 block text-left text-[11px] text-ink/45" dir="ltr">{formatTime(message.createdAt)}</span>
      </div>
    </div>
  );
}

function statusLabel(status: string) {
  if (status === 'loading') return 'در حال دریافت پیام‌ها';
  if (status === 'sending') return 'در حال ارسال';
  if (status === 'error') return 'خطا در اتصال';
  return 'آنلاین';
}

function formatTime(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
