import { ArrowDown, CheckCheck, ChevronLeft, ChevronRight, Copy, CornerUpLeft, LoaderCircle, MessageCircle, Search, Send, ShieldCheck, Trash2, Users, Wifi, WifiOff, X } from 'lucide-react';
import { KeyboardEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/api-client';

interface ChatMessage {
  id: string; text: string; senderRole: 'admin' | 'student' | 'ADMIN' | 'STUDENT'; senderName?: string;
  createdAt?: string; editedAt?: string | null; deletedAt?: string | null; replyToId?: string | null; isRead?: boolean;
  linkedTask?: { id: string; title: string; subject?: string; startTime?: string; endTime?: string } | null;
}
interface ConversationParticipant { id: string; username?: string; name?: string; displayName?: string; bio?: string; avatarUrl?: string; isSelf?: boolean; accountRole?: string; }
interface Conversation {
  id: string; type?: 'direct' | 'group'; title?: string; description?: string; unread?: number; muted?: boolean;
  memberCount?: number; participants?: ConversationParticipant[]; peer?: ConversationParticipant;
  readOnly?: boolean; observedStudent?: { id: string; name: string } | null;
  autoManaged?: boolean; organization?: { id: string; name: string } | null;
  lastMessage?: ChatMessage | null;
}

const CHAT_LAST_READ_KEY = 'moshaver_v2_chat_last_read';
const CHAT_DRAFT_KEY = 'moshaver_v2_chat_draft';
const PAGE_SIZE = 50;

export function ChatPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const linkedTaskId = searchParams.get('task');
  const linkedTaskTitle = searchParams.get('title') || 'فعالیت برنامه';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState(() => localStorage.getItem(CHAT_DRAFT_KEY) || '');
  const [status, setStatus] = useState<'loading' | 'ready' | 'sending' | 'error'>('loading');
  const [online, setOnline] = useState(navigator.onLine);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [inboxStatus, setInboxStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [inboxSearch, setInboxSearch] = useState('');
  const [lastReadAt, setLastReadAt] = useState(() => localStorage.getItem(CHAT_LAST_READ_KEY));
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [nearBottom, setNearBottom] = useState(true);
  const [pendingBelow, setPendingBelow] = useState(0);
  const [allowedEmojis, setAllowedEmojis] = useState(['❤️', '👍', '😂', '👏', '😮', '😢', '🔥', '🎉', '🙏', '✅']);
  const [profile, setProfile] = useState<ConversationParticipant | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldStickRef = useRef(true);
  const loadingHistoryRef = useRef(false);
  const previousCountRef = useRef(0);

  async function loadConversations(background = false) {
    try {
      const next = await apiClient.request<Conversation[]>('GET', '/chat/conversations');
      setConversations(next);
      setInboxStatus('ready');
    } catch { if (!background) setInboxStatus('error'); }
  }

  async function openConversation(nextConversation: Conversation, background = false) {
    if (!background) {
      setConversation(nextConversation);
      setMessages([]);
      setStatus('loading');
    }
    try {
      const next = await apiClient.request<ChatMessage[]>('GET', `/chat/conversations/${encodeURIComponent(nextConversation.id)}/messages?limit=${PAGE_SIZE}`);
      setMessages((current) => background ? mergeMessages(current, next) : next);
      setHasOlder(next.length === PAGE_SIZE);
      setStatus('ready');
    } catch { if (!background) setStatus('error'); }
  }

  function closeConversation() {
    setConversation(null); setMessages([]); setReplyTo(null); setActiveMessageId(null); setSearchOpen(false); setSearch('');
    void loadConversations(true);
  }
  async function openPeerProfile() {
    if (!conversation?.peer?.id) return;
    setProfile(conversation.peer); setProfileOpen(true);
    try { setProfile(await apiClient.request<ConversationParticipant>('GET', `/chat/profiles/${encodeURIComponent(conversation.peer.id)}`)); }
    catch { /* The summary from the authorized conversation remains available. */ }
  }

  async function loadOlder() {
    const first = messages[0];
    if (!conversation || !first?.createdAt || loadingOlder || !hasOlder) return;
    const node = scrollRef.current;
    const oldHeight = node?.scrollHeight || 0;
    loadingHistoryRef.current = true;
    setLoadingOlder(true);
    try {
      const older = await apiClient.request<ChatMessage[]>('GET', `/chat/conversations/${encodeURIComponent(conversation.id)}/messages?limit=${PAGE_SIZE}&before=${encodeURIComponent(first.createdAt)}`);
      setMessages((current) => mergeMessages(older, current));
      setHasOlder(older.length === PAGE_SIZE);
      requestAnimationFrame(() => { if (node) node.scrollTop += node.scrollHeight - oldHeight; });
    } finally { setLoadingOlder(false); }
  }

  function markChatRead(nextMessages = messages) {
    const latest = nextMessages[nextMessages.length - 1]?.createdAt;
    if (!latest) return;
    localStorage.setItem(CHAT_LAST_READ_KEY, latest);
    setLastReadAt(latest);
    setPendingBelow(0);
    if (conversation && !conversation.readOnly) void apiClient.request('POST', `/chat/conversations/${encodeURIComponent(conversation.id)}/read`).catch(() => undefined);
  }

  async function sendMessage() {
    const value = text.trim();
    if (!value || !conversation) return;
    const temporaryId = `pending-${Date.now()}`;
    const optimistic: ChatMessage = { id: temporaryId, text: value, senderRole: 'student', createdAt: new Date().toISOString(), replyToId: replyTo?.id, linkedTask: linkedTaskId ? { id: linkedTaskId, title: linkedTaskTitle } : null };
    shouldStickRef.current = true;
    setMessages((current) => [...current, optimistic]);
    setText(''); localStorage.removeItem(CHAT_DRAFT_KEY); setReplyTo(null); setStatus('sending');
    try {
      const message = await apiClient.request<ChatMessage, { text: string; replyToId?: string; taskId?: string }>('POST', `/chat/conversations/${encodeURIComponent(conversation.id)}/messages`, { text: value, replyToId: optimistic.replyToId || undefined, taskId: linkedTaskId || undefined });
      setMessages((current) => current.map((item) => item.id === temporaryId ? message : item));
      setStatus('ready');
    } catch {
      setMessages((current) => current.filter((item) => item.id !== temporaryId));
      setText(value); localStorage.setItem(CHAT_DRAFT_KEY, value); setStatus('error');
    }
  }

  async function removeMessage(message: ChatMessage) {
    if (!conversation || !isMine(message) || message.id.startsWith('pending-')) return;
    await apiClient.request('DELETE', `/chat/conversations/${encodeURIComponent(conversation.id)}/messages/${encodeURIComponent(message.id)}`);
    setMessages((current) => current.map((item) => item.id === message.id ? { ...item, text: '', deletedAt: new Date().toISOString() } : item));
    setActiveMessageId(null);
  }

  async function reactWith(message: ChatMessage, emoji: string) {
    if (!conversation) return;
    await apiClient.request('POST', `/chat/conversations/${encodeURIComponent(conversation.id)}/messages/${encodeURIComponent(message.id)}/reactions`, { emoji });
    setActiveMessageId(null);
  }

  useEffect(() => {
    void loadConversations();
    void apiClient.request<{ allowedEmojis: string[] }>('GET', '/chat/configuration').then((value) => {
      if (Array.isArray(value.allowedEmojis) && value.allowedEmojis.length) setAllowedEmojis(value.allowedEmojis.slice(0, 10));
    }).catch(() => undefined);
    const timer = window.setInterval(() => { void loadConversations(true); if (conversation) void openConversation(conversation, true); }, 15_000);
    const realtime = (event: Event) => { if ((event as CustomEvent<{ type?: string }>).detail?.type?.startsWith('chat.')) { void loadConversations(true); if (conversation) void openConversation(conversation, true); } };
    const setOnlineState = () => setOnline(navigator.onLine);
    window.addEventListener('moshaver:v2-event', realtime); window.addEventListener('online', setOnlineState); window.addEventListener('offline', setOnlineState);
    return () => { window.clearInterval(timer); window.removeEventListener('moshaver:v2-event', realtime); window.removeEventListener('online', setOnlineState); window.removeEventListener('offline', setOnlineState); };
  }, [conversation?.id]);

  useEffect(() => { localStorage.setItem(CHAT_DRAFT_KEY, text); }, [text]);
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const added = Math.max(0, messages.length - previousCountRef.current);
    if (loadingHistoryRef.current) loadingHistoryRef.current = false;
    else if (shouldStickRef.current || nearBottom) { node.scrollTop = node.scrollHeight; setPendingBelow(0); }
    else if (added) setPendingBelow((count) => count + added);
    previousCountRef.current = messages.length; shouldStickRef.current = false;
  }, [messages.length, nearBottom]);

  const unreadCount = messages.filter((message) => !isMine(message) && (!lastReadAt || new Date(message.createdAt || 0) > new Date(lastReadAt))).length;
  const visibleMessages = useMemo(() => search.trim() ? messages.filter((message) => message.text.toLowerCase().includes(search.trim().toLowerCase())) : messages, [messages, search]);
  const byId = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);
  const visibleConversations = useMemo(() => {
    const query = inboxSearch.trim().toLocaleLowerCase('fa');
    return conversations.filter((item) => !query || `${item.title || ''} ${item.description || ''} ${item.peer?.username || ''}`.toLocaleLowerCase('fa').includes(query));
  }, [conversations, inboxSearch]);

  function jumpToMessage(id: string) {
    document.getElementById(`chat-message-${id}`)?.scrollIntoView({ block: 'center' });
    setActiveMessageId(id); window.setTimeout(() => setActiveMessageId(null), 1400);
  }
  function jumpToBottom() { const node = scrollRef.current; if (node) node.scrollTop = node.scrollHeight; setNearBottom(true); markChatRead(); }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } if (event.key === 'Escape') setReplyTo(null); }

  if (!conversation) return <section className="student-chat-inbox" aria-label="گفت‌وگوها">
    <header className="student-chat-inbox__header">
      <span><strong>گفت‌وگوها</strong><small>{conversations.length ? `${conversations.length.toLocaleString('fa-IR')} گفت‌وگوی فعال` : 'ارتباط امن با مشاور و گروه‌ها'}</small></span>
    </header>
    {linkedTaskId ? <div className="student-chat__task-context"><MessageCircle /><span><strong>انتخاب گفتگو برای این فعالیت</strong><small>{linkedTaskTitle}</small></span></div> : null}
    <label className="student-chat-inbox__search"><Search /><input value={inboxSearch} onChange={(event) => setInboxSearch(event.target.value)} placeholder="جست‌وجوی گفتگو یا نام کاربری" /></label>
    <div className="student-chat-inbox__list">
      {inboxStatus === 'loading' ? <div className="student-chat__state"><LoaderCircle />در حال دریافت گفتگوها</div> : null}
      {inboxStatus === 'error' ? <div className="student-chat__state"><button type="button" onClick={() => void loadConversations()}>دریافت گفتگوها ناموفق بود؛ تلاش دوباره</button></div> : null}
      {inboxStatus === 'ready' && !visibleConversations.length ? <div className="student-chat-inbox__empty"><MessageCircle /><strong>{inboxSearch ? 'گفتگویی پیدا نشد' : 'هنوز گفتگویی ندارید'}</strong><small>{inboxSearch ? 'عبارت دیگری را جست‌وجو کنید.' : 'پس از ایجاد ارتباط، گفتگوها و گروه‌ها اینجا نمایش داده می‌شوند.'}</small></div> : null}
      {visibleConversations.map((item) => <button type="button" className="student-conversation-row" key={item.id} onClick={() => void openConversation(item)}>
        <span className={`student-conversation-row__avatar ${item.type === 'group' ? 'is-group' : ''}`}>{item.type === 'group' ? <Users /> : initials(item.title)}</span>
        <span className="student-conversation-row__body"><span><strong>{item.title || 'گفتگو'}{item.autoManaged ? <em>رسمی</em> : null}</strong><time>{item.readOnly ? `فقط‌خواندنی · ${item.observedStudent?.name || 'فرزند'}` : formatInboxTime(item.lastMessage?.createdAt)}</time></span><span><small>{item.lastMessage?.deletedAt ? 'پیام حذف شده' : item.lastMessage?.text || item.description || (item.type === 'group' ? `${item.memberCount || item.participants?.length || 0} عضو` : `@${item.peer?.username || 'کاربر'}`)}</small>{item.unread ? <i>{item.unread.toLocaleString('fa-IR')}</i> : null}</span></span>
        <ChevronLeft />
      </button>)}
    </div>
  </section>;

  return <section className="student-chat" aria-label={`گفت‌وگو با ${conversation.title || 'کاربر'}`}>
    <header className="student-chat__header">
      <button type="button" onClick={closeConversation} aria-label="بازگشت به گفتگوها"><ChevronRight /></button>
      <button type="button" className="student-chat__avatar" onClick={() => void openPeerProfile()} disabled={conversation.type === 'group'} aria-label={conversation.type === 'group' ? 'تصویر گروه' : `مشاهده پروفایل ${conversation.title || 'کاربر'}`}>{conversation.peer?.avatarUrl ? <img src={conversation.peer.avatarUrl} alt="" /> : conversation.type === 'group' ? <Users /> : initials(conversation.title)}</button>
      <button type="button" className="student-chat__identity" onClick={() => void openPeerProfile()} disabled={conversation.type === 'group'}><strong>{conversation?.title || 'مشاور'}</strong><small>{statusLabel(status, online)}</small></button>
      {unreadCount ? <i>{unreadCount.toLocaleString('fa-IR')}</i> : null}
      <button type="button" onClick={() => setSearchOpen((value) => !value)} aria-label="جست‌وجوی پیام"><Search /></button>
      <span className={`student-chat__connection ${online ? 'is-online' : ''}`} title={online ? 'آنلاین' : 'آفلاین'}>{online ? <Wifi /> : <WifiOff />}</span>
    </header>
    {profileOpen && profile ? <div className="student-chat-profile" role="dialog" aria-modal="true" aria-label={`پروفایل ${profile.displayName || profile.name || profile.username || 'کاربر'}`}><button type="button" className="student-chat-profile__backdrop" onClick={() => setProfileOpen(false)} aria-label="بستن پروفایل" /><article><button type="button" onClick={() => setProfileOpen(false)} aria-label="بستن"><X /></button><span>{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : initials(profile.displayName || profile.name || profile.username)}</span><h2>{profile.displayName || profile.name || profile.username}</h2><b dir="ltr">@{profile.username}</b>{profile.bio ? <p>{profile.bio}</p> : <p>اطلاعات بیشتری ثبت نشده است.</p>}</article></div> : null}
    {conversation.readOnly ? <div className="student-chat__readonly"><ShieldCheck />گفتگوی {conversation.observedStudent?.name || 'دانش‌آموز'} را فقط مشاهده می‌کنید.</div> : null}
    {searchOpen ? <div className="student-chat__search"><Search /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجو در پیام‌ها" aria-label="جست‌وجو در پیام‌ها"/><button type="button" onClick={() => { setSearch(''); setSearchOpen(false); }} aria-label="بستن جست‌وجو"><X /></button></div> : null}
    <div ref={scrollRef} className="student-chat__messages" onScroll={(event) => { const node = event.currentTarget; const close = node.scrollHeight - node.scrollTop - node.clientHeight < 96; setNearBottom(close); if (close) markChatRead(); }}>
      {hasOlder ? <button type="button" className="student-chat__older" onClick={() => void loadOlder()} disabled={loadingOlder}>{loadingOlder ? <LoaderCircle /> : null}{loadingOlder ? 'در حال دریافت' : 'پیام‌های قدیمی‌تر'}</button> : null}
      {status === 'loading' ? <div className="student-chat__state"><LoaderCircle />در حال دریافت پیام‌ها</div> : null}
      {status !== 'loading' && !visibleMessages.length ? <div className="student-chat__state">{search ? 'نتیجه‌ای پیدا نشد.' : 'هنوز گفت‌وگویی وجود ندارد.'}</div> : null}
      {visibleMessages.map((message, index) => {
        const previous = visibleMessages[index - 1]; const showDate = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
        const grouped = Boolean(previous && isMine(previous) === isMine(message) && minutesBetween(previous.createdAt, message.createdAt) < 5 && !message.replyToId && !showDate);
        return <div key={message.id}>{showDate ? <div className="student-chat__date">{formatDate(message.createdAt)}</div> : null}<Bubble message={message} grouped={grouped} referenced={message.replyToId ? byId.get(message.replyToId) : undefined} active={activeMessageId === message.id} actionsOpen={activeMessageId === message.id} allowedEmojis={allowedEmojis} onToggleActions={() => setActiveMessageId((id) => id === message.id ? null : message.id)} onReply={() => { setReplyTo(message); setActiveMessageId(null); }} onJump={() => message.replyToId && jumpToMessage(message.replyToId)} onDelete={() => void removeMessage(message)} onReact={(emoji) => void reactWith(message, emoji)} /></div>;
      })}
    </div>
    {!nearBottom ? <button type="button" className="student-chat__jump" onClick={jumpToBottom} aria-label={`رفتن به آخر گفتگو${pendingBelow ? `، ${pendingBelow.toLocaleString('fa-IR')} پیام جدید` : ''}`}><ArrowDown />{pendingBelow ? <i>{pendingBelow.toLocaleString('fa-IR')}</i> : null}</button> : null}
    {!conversation.readOnly ? <form className="student-chat__composer" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
      {linkedTaskId ? <div className="student-chat__linked-task"><span><small>پیوست فعالیت</small><strong>{linkedTaskTitle}</strong></span><Link to={`/plan?task=${encodeURIComponent(linkedTaskId)}`}>مشاهده</Link></div> : null}
      {replyTo ? <div className="student-chat__replying"><span><small>پاسخ به {replyTo.senderName || (isMine(replyTo) ? 'خودتان' : 'مشاور')}</small><strong>{replyTo.text}</strong></span><button type="button" onClick={() => setReplyTo(null)} aria-label="لغو پاسخ"><X /></button></div> : null}
      {status === 'error' ? <button type="button" className="student-chat__retry" onClick={() => void openConversation(conversation)}>اتصال ناموفق بود؛ تلاش دوباره</button> : null}
      <textarea rows={1} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown} placeholder="پیام..." aria-label="متن پیام" />
      <button type="submit" disabled={!text.trim() || status === 'sending' || !conversation} aria-label="ارسال پیام">{status === 'sending' ? <LoaderCircle /> : <Send />}</button>
    </form> : null}
  </section>;
}

function Bubble({ message, grouped, referenced, active, actionsOpen, allowedEmojis, onToggleActions, onReply, onJump, onDelete, onReact }: { message: ChatMessage; grouped: boolean; referenced?: ChatMessage; active: boolean; actionsOpen: boolean; allowedEmojis: string[]; onToggleActions(): void; onReply(): void; onJump(): void; onDelete(): void; onReact(emoji: string): void }) {
  const mine = isMine(message);
  return <article id={`chat-message-${message.id}`} className={`student-message ${mine ? 'is-mine' : 'is-theirs'} ${grouped ? 'is-grouped' : ''} ${active ? 'is-active' : ''}`} onContextMenu={(event) => { event.preventDefault(); onToggleActions(); }}>
    {message.linkedTask ? <Link className="student-message__task" to={`/plan?task=${encodeURIComponent(message.linkedTask.id)}`}><small>فعالیت برنامه</small><strong>{[message.linkedTask.subject, message.linkedTask.title].filter(Boolean).join(' · ')}</strong>{message.linkedTask.startTime ? <span dir="ltr">{message.linkedTask.startTime} — {message.linkedTask.endTime}</span> : null}</Link> : null}
    <button type="button" className="student-message__bubble" onClick={onToggleActions} aria-label={`${mine ? 'پیام شما' : `پیام ${message.senderName || 'مشاور'}`}: ${message.deletedAt ? 'حذف شده' : message.text}`}>
      {!grouped && !mine ? <strong className="student-message__sender">{message.senderName || 'مشاور'}</strong> : null}
      {referenced ? <span className="student-message__reply" onClick={(event) => { event.stopPropagation(); onJump(); }}><small>{referenced.senderName || (isMine(referenced) ? 'شما' : 'مشاور')}</small><b>{referenced.text || 'پیام حذف شده'}</b></span> : null}
      <span className="student-message__text">{message.deletedAt ? 'این پیام حذف شده است.' : message.text}</span>
      <small className="student-message__meta" dir="ltr">{message.editedAt ? 'ویرایش · ' : ''}{formatTime(message.createdAt)}{mine ? <CheckCheck /> : null}</small>
    </button>
    {actionsOpen && !message.deletedAt ? <div className="student-message__actions"><div className="student-message__emoji-picker" aria-label="انتخاب واکنش">{allowedEmojis.map((emoji) => <button type="button" key={emoji} onClick={() => onReact(emoji)} aria-label={`واکنش ${emoji}`}>{emoji}</button>)}</div><button type="button" onClick={onReply}><CornerUpLeft />پاسخ</button><button type="button" onClick={() => void navigator.clipboard?.writeText(message.text)}><Copy />کپی</button>{mine ? <button type="button" className="is-danger" onClick={onDelete}><Trash2 />حذف</button> : null}</div> : null}
  </article>;
}

function mergeMessages(first: ChatMessage[], second: ChatMessage[]) { return [...new Map([...first, ...second].map((message) => [message.id, message])).values()].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()); }
function isMine(message: ChatMessage) { return String(message.senderRole).toLowerCase() === 'student'; }
function dayKey(value?: string) { return value ? new Date(value).toDateString() : ''; }
function minutesBetween(first?: string, second?: string) { return Math.abs(new Date(second || 0).getTime() - new Date(first || 0).getTime()) / 60_000; }
function statusLabel(status: string, online: boolean) { if (!online) return 'آفلاین'; if (status === 'loading') return 'در حال دریافت پیام‌ها'; if (status === 'sending') return 'در حال ارسال'; if (status === 'error') return 'خطا در اتصال'; return 'آنلاین'; }
function formatTime(value?: string) { return value ? new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : ''; }
function formatDate(value?: string) { return value ? new Intl.DateTimeFormat('fa-IR', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(value)) : ''; }
function formatInboxTime(value?: string) { if (!value) return ''; const date = new Date(value); const today = new Date(); return date.toDateString() === today.toDateString() ? formatTime(value) : new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(date); }
function initials(value?: string) { return (value || 'گ').trim().slice(0, 1); }
