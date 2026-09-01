import { CheckCheck, Send, Wifi, WifiOff } from 'lucide-react';
import { KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { apiClient } from '../../services/api-client';

interface ChatMessage {
  id: string;
  text: string;
  senderRole: 'admin' | 'student' | 'ADMIN' | 'STUDENT';
  createdAt?: string;
}

interface Conversation {
  id: string;
}

const CHAT_LAST_READ_KEY = 'moshaver_v2_chat_last_read';

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'sending' | 'error'>('loading');
  const [online, setOnline] = useState(navigator.onLine);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lastReadAt, setLastReadAt] = useState(() => localStorage.getItem(CHAT_LAST_READ_KEY));
  const scrollRef = useRef<HTMLDivElement | null>(null);

  async function loadMessages() {
    try {
      const conversations = await apiClient.request<Conversation[]>('GET', '/chat/conversations');
      const id = conversations[0]?.id;
      if (!id) {
        setMessages([]);
        setStatus('ready');
        return;
      }
      setConversationId(id);
      const next = await apiClient.request<ChatMessage[]>('GET', `/chat/conversations/${encodeURIComponent(id)}/messages`);
      setMessages(next);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  function markChatRead(nextMessages = messages) {
    const latest = nextMessages[nextMessages.length - 1]?.createdAt;
    if (!latest) return;
    localStorage.setItem(CHAT_LAST_READ_KEY, latest);
    setLastReadAt(latest);
    if (conversationId) void apiClient.request('POST', `/chat/conversations/${encodeURIComponent(conversationId)}/read`).catch(() => undefined);
  }

  async function sendMessage() {
    const value = text.trim();
    if (!value) return;
    setStatus('sending');
    setText('');
    try {
      if (!conversationId) throw new Error('گفتگویی برای ارسال پیدا نشد.');
      const message = await apiClient.request<ChatMessage, { text: string }>('POST', `/chat/conversations/${encodeURIComponent(conversationId)}/messages`, { text: value });
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

  const unreadCount = messages.filter((message) => String(message.senderRole).toLowerCase() !== 'student' && (!lastReadAt || new Date(message.createdAt || 0) > new Date(lastReadAt))).length;

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <section className="flex h-[calc(100vh-164px)] min-h-[520px] flex-col overflow-hidden rounded-md border border-black/10 bg-[#efeae2]">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-black/10 bg-white px-4 py-3">
        <div>
          <div>
            <h1 className="text-base font-semibold">مشاور</h1>
            <p className="text-xs text-ink/60">{statusLabel(status)}</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount ? <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">{unreadCount} خوانده‌نشده</span> : null}
            <button type="button" className="rounded-md bg-paper px-2 py-1 text-xs text-ink/70" onClick={() => markChatRead()}>خوانده شد</button>
          </div>
        </div>
        <span className={`grid size-9 place-items-center rounded-md ${online ? 'bg-mint/15 text-mint' : 'bg-red-50 text-red-700'}`}>
          {online ? <Wifi size={18} /> : <WifiOff size={18} />}
        </span>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-auto px-3 py-4">
        {messages.length ? messages.map((message) => <Bubble key={message.id} message={message} />) : (
          <div className="mx-auto mt-8 max-w-xs rounded-md bg-white/90 px-3 py-2 text-center text-sm text-ink/60 shadow-sm">
            هنوز پیامی ثبت نشده است.
          </div>
        )}
      </div>

      <form
        className="grid shrink-0 grid-cols-[1fr_44px] gap-2 border-t border-black/10 bg-white p-2"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage();
        }}
      >
        <textarea
          className="max-h-28 min-h-11 resize-none rounded-md border border-black/10 bg-paper px-3 py-2 outline-none focus:border-ink"
          rows={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
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
        <span className="mt-1 flex items-center justify-end gap-1 text-left text-[11px] text-ink/45" dir="ltr">{formatTime(message.createdAt)}{mine ? <CheckCheck size={13} /> : null}</span>
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
