import { InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, CheckCheck, ChevronUp, LoaderCircle, MessageCircle, RefreshCw, Search, Send, WifiOff } from "lucide-react";
import { KeyboardEvent, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, Button, Card, EmptyState, Textarea } from "../../components/ui";
import { notify } from "../../components/toast";
import { normalizePersianText } from "../../lib/utils";
import { api } from "../../services/api";
import type { ChatMessage, Conversation } from "../../types/domain";

type ConversationPage = { items: Conversation[]; total: number; totalUnread: number; hasMore: boolean; nextOffset?: number };
export type MessagePage = { messages: ChatMessage[]; hasMore?: boolean; nextBeforeMessageId?: string; unread?: number; otherReadAt?: string };

export function chatSearchMatch(item: Conversation, search: string) {
  const needle = normalizePersianText(search).trim().toLocaleLowerCase("fa");
  if (!needle) return true;
  return normalizePersianText(`${item.student?.name || ""} ${item.student?.grade || ""} ${item.lastMessage?.text || ""}`).toLocaleLowerCase("fa").includes(needle);
}

export function mergeMessagePages(data?: InfiniteData<MessagePage>) {
  if (!data) return [];
  const seen = new Set<string>();
  return [...data.pages].reverse().flatMap((page) => page.messages).filter((message) => {
    if (seen.has(message.id)) return false;
    seen.add(message.id);
    return true;
  });
}

export function ChatPage() {
  const [params, setParams] = useSearchParams();
  const requestedStudentId = params.get("studentId") || "";
  const requestedConversationId = params.get("conversationId") || "";
  const [conversationId, setConversationId] = useState(requestedConversationId);
  const [showMessages, setShowMessages] = useState(!!requestedConversationId || !!requestedStudentId);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const shouldStickRef = useRef(true);
  const historyHeightRef = useRef<number | null>(null);

  const conversations = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: async () => {
      const result = await api.get<ConversationPage | Conversation[]>("/admin/chat/conversations?limit=100&offset=0");
      return Array.isArray(result) ? { items: result, total: result.length, totalUnread: 0, hasMore: false } : result;
    },
    refetchInterval: 30_000,
  });
  const allConversations = conversations.data?.items ?? [];
  const filtered = useMemo(() => allConversations.filter((item) => chatSearchMatch(item, deferredSearch)), [allConversations, deferredSearch]);
  const active = useMemo(() =>
    allConversations.find((item) => item.id === conversationId) ??
    allConversations.find((item) => item.id === requestedConversationId) ??
    allConversations.find((item) => String(item.student?.id || "") === requestedStudentId) ??
    allConversations[0],
  [allConversations, conversationId, requestedConversationId, requestedStudentId]);

  const messages = useInfiniteQuery({
    queryKey: ["chat-messages", active?.id],
    enabled: !!active?.id,
    initialPageParam: "",
    queryFn: ({ pageParam }) => api.get<MessagePage>(`/chat/conversations/${active?.id}/messages?limit=50${pageParam ? `&beforeMessageId=${encodeURIComponent(pageParam)}` : ""}`),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextBeforeMessageId : undefined,
    refetchInterval: 20_000,
  });
  const messageItems = useMemo(() => mergeMessagePages(messages.data), [messages.data]);

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/chat/conversations/${id}/read`, {}),
    onSuccess: (_, id) => qc.setQueryData<ConversationPage>(["chat-conversations"], (current) => current ? {
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, unread: 0 } : item),
      totalUnread: Math.max(0, current.totalUnread - Number(current.items.find((item) => item.id === id)?.unread || 0)),
    } : current),
  });
  const send = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api.post<ChatMessage>(`/chat/conversations/${id}/messages`, { text: body }),
    onMutate: async ({ id, body }) => {
      const key = ["chat-messages", id] as const;
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<InfiniteData<MessagePage>>(key);
      const optimistic: ChatMessage = { id: `pending-${crypto.randomUUID()}`, text: body, senderRole: "admin", createdAt: new Date().toISOString(), pending: true };
      qc.setQueryData<InfiniteData<MessagePage>>(key, (current) => {
        if (!current?.pages.length) return { pages: [{ messages: [optimistic] }], pageParams: [""] };
        const pages = [...current.pages];
        pages[0] = { ...pages[0], messages: [...pages[0].messages, optimistic] };
        return { ...current, pages };
      });
      shouldStickRef.current = true;
      setText("");
      return { previous, key, body };
    },
    onSuccess: (message, _, context) => {
      if (!context) return;
      qc.setQueryData<InfiniteData<MessagePage>>(context.key, (current) => current ? { ...current, pages: current.pages.map((page) => ({ ...page, messages: page.messages.map((item) => item.id.startsWith("pending-") ? message : item) })) } : current);
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: (error, _, context) => {
      if (context?.previous) qc.setQueryData(context.key, context.previous);
      if (context?.body) setText(context.body);
      notify(error instanceof Error ? error.message : "ارسال پیام ناموفق بود.", "error");
    },
  });

  useEffect(() => {
    const source = api.openEvents((type, data) => {
      if (!type.startsWith("chat.")) return;
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      if (active?.id && data.conversationId === active.id) {
        shouldStickRef.current = isNearBottom(scrollRef.current);
        void qc.invalidateQueries({ queryKey: ["chat-messages", active.id] });
      }
    });
    return () => source.close();
  }, [active?.id, qc]);

  useEffect(() => {
    if (!active?.id) return;
    if (conversationId !== active.id) setConversationId(active.id);
    setParams((current) => {
      current.set("conversationId", active.id);
      if (active.student?.id) current.set("studentId", active.student.id);
      return current;
    }, { replace: true });
  }, [active?.id]);

  useEffect(() => {
    if (active?.id && active.unread && messages.isSuccess && !markRead.isPending) markRead.mutate(active.id);
  }, [active?.id, active?.unread, messages.isSuccess]);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    if (historyHeightRef.current != null) {
      node.scrollTop += node.scrollHeight - historyHeightRef.current;
      historyHeightRef.current = null;
    } else if (shouldStickRef.current) node.scrollTop = node.scrollHeight;
  }, [messageItems.length, active?.id]);

  function selectConversation(item: Conversation) {
    shouldStickRef.current = true;
    setShowMessages(true);
    setConversationId(item.id);
    setParams((current) => {
      current.set("conversationId", item.id);
      if (item.student?.id) current.set("studentId", item.student.id);
      return current;
    });
  }
  function submit() {
    const body = text.trim();
    if (body && active?.id && !send.isPending) send.mutate({ id: active.id, body });
  }
  function loadOlder() {
    if (!scrollRef.current || !messages.hasNextPage || messages.isFetchingNextPage) return;
    historyHeightRef.current = scrollRef.current.scrollHeight;
    void messages.fetchNextPage();
  }

  return (
    <div className="grid h-[calc(100dvh-132px)] min-h-[520px] overflow-hidden lg:h-[calc(100dvh-96px)]">
      <section className="grid min-h-0 gap-3 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <Card className={`${showMessages ? "hidden lg:flex" : "flex"} min-h-0 flex-col overflow-hidden p-0`}>
          <div className="border-b p-3">
            <div className="flex items-center gap-2"><MessageCircle size={18} /><strong>گفتگوها</strong><Badge tone="blue">{conversations.data?.total ?? allConversations.length}</Badge>{conversations.isFetching ? <RefreshCw className="mr-auto animate-spin text-slate-400" size={15} /> : null}</div>
            <label className="mt-3 flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3"><Search size={16} className="text-slate-400" /><input className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="نام، پایه یا متن آخرین پیام" aria-label="جستجوی گفتگوها" /></label>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {conversations.isLoading ? <ConversationSkeleton /> : conversations.isError ? <EmptyState title="دریافت گفتگوها ناموفق بود." action={<Button variant="soft" onClick={() => void conversations.refetch()}>تلاش دوباره</Button>} /> : filtered.length ? filtered.map((item) => (
              <button key={item.id} onClick={() => selectConversation(item)} className={`flex w-full items-center gap-3 border-b p-3 text-right transition hover:bg-slate-50 ${active?.id === item.id ? "bg-teal-50" : ""}`}>
                <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">{(item.student?.name || "د").slice(0, 1)}{item.presence?.online ? <i className="absolute bottom-0 left-0 size-3 rounded-full border-2 border-white bg-emerald-500" /> : null}</span>
                <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><strong className="truncate">{item.student?.name || "دانش‌آموز"}</strong><small className="shrink-0 text-[10px] text-slate-400">{formatConversationTime(item.lastMessage?.createdAt)}</small></span><small className="mt-1 block truncate text-slate-500">{item.lastMessage?.text || "هنوز پیامی ثبت نشده"}</small></span>
                {item.unread ? <Badge tone="red">{item.unread}</Badge> : null}
              </button>
            )) : <EmptyState title={search ? "گفتگویی مطابق جستجو نیست." : "گفتگویی وجود ندارد."} />}
          </div>
        </Card>

        <Card className={`${showMessages ? "flex" : "hidden lg:flex"} min-h-0 flex-col overflow-hidden p-0`}>
          {active ? <>
            <div className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2"><button className="grid size-9 shrink-0 place-items-center rounded-md hover:bg-slate-100 lg:hidden" aria-label="بازگشت به گفتگوها" onClick={() => { setShowMessages(false); setParams((current) => { current.delete("conversationId"); current.delete("studentId"); return current; }); }}><ArrowRight size={19} /></button><div className="min-w-0"><strong className="block truncate">{active.student?.name || "گفتگو"}</strong><span className={`text-xs ${active.presence?.online ? "text-emerald-600" : "text-slate-500"}`}>{active.presence?.online ? "آنلاین" : active.student?.grade || "آفلاین"}</span></div></div>
              <button type="button" className="flex shrink-0 items-center gap-1 text-xs text-slate-500" onClick={() => markRead.mutate(active.id)} disabled={markRead.isPending || !active.unread}>{markRead.isPending ? <LoaderCircle size={17} className="animate-spin" /> : <CheckCheck size={17} />}<span className="hidden sm:inline">خوانده شد</span></button>
            </div>
            <div ref={scrollRef} onScroll={(event) => { shouldStickRef.current = isNearBottom(event.currentTarget); }} className="min-h-0 flex-1 space-y-2 overflow-auto bg-[#efeae2] p-3 sm:p-4">
              {messages.hasNextPage ? <div className="flex justify-center"><Button className="h-8" variant="soft" loading={messages.isFetchingNextPage} onClick={loadOlder}><ChevronUp size={15} /> پیام‌های قدیمی‌تر</Button></div> : null}
              {messages.isLoading ? <MessageSkeleton /> : messages.isError ? <EmptyState title="دریافت پیام‌ها ناموفق بود." action={<Button variant="soft" onClick={() => void messages.refetch()}><WifiOff size={15} /> تلاش دوباره</Button>} /> : messageItems.length ? messageItems.map((message, index) => <div key={message.id}>{showDateSeparator(messageItems[index - 1], message) ? <div className="my-3 text-center"><span className="rounded-full bg-white/80 px-3 py-1 text-[11px] text-slate-500 shadow-sm">{formatDate(message.createdAt)}</span></div> : null}<Bubble message={message} mine={String(message.senderRole).toLowerCase() === "admin"} /></div>) : <EmptyState title="هنوز پیامی ثبت نشده است." />}
            </div>
            <div className="flex gap-2 overflow-x-auto border-t bg-white px-3 pt-2">{["برنامه امروزت را انجام دادی؟", "اگر بخشی سخت بود، بگو تا اصلاحش کنم.", "نتیجه آزمون را برایم بفرست."].map((item) => <button key={item} type="button" className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs hover:bg-slate-200" onClick={() => setText(item)}>{item}</button>)}</div>
            <form className="grid shrink-0 grid-cols-[minmax(0,1fr)_44px] gap-2 bg-white p-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
              <div><Textarea aria-label="متن پیام" className="max-h-28 min-h-11 resize-none py-2" rows={1} maxLength={3000} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="پیام… (Shift+Enter برای خط جدید)" /><span className={`mt-1 block text-left text-[10px] ${text.length > 2800 ? "text-amber-700" : "text-slate-400"}`} dir="ltr">{text.length}/3000</span></div>
              <button className="grid size-11 place-items-center rounded-md bg-brand text-white disabled:opacity-50" disabled={!text.trim() || send.isPending} aria-label="ارسال پیام">{send.isPending ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}</button>
            </form>
          </> : <EmptyState title="یک گفتگو را انتخاب کنید." />}
        </Card>
      </section>
    </div>
  );
}

function Bubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return <div className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-lg px-3 py-2 text-sm shadow-sm sm:max-w-[76%] ${mine ? "bg-[#d9fdd3]" : "bg-white"} ${message.pending ? "opacity-70" : ""}`}><p className="whitespace-pre-wrap break-words leading-7">{message.text}</p><span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400" dir="ltr">{message.pending ? "در حال ارسال" : formatTime(message.createdAt)}{mine && !message.pending ? message.seen ? <CheckCheck size={13} className="text-sky-600" /> : <Check size={13} /> : null}</span></div></div>;
}
function ConversationSkeleton() { return <div className="grid gap-px">{[1,2,3,4,5].map((item) => <div key={item} className="flex gap-3 p-3"><span className="size-10 animate-pulse rounded-full bg-slate-100" /><span className="grid flex-1 gap-2"><i className="h-4 w-1/2 animate-pulse rounded bg-slate-100" /><i className="h-3 w-4/5 animate-pulse rounded bg-slate-100" /></span></div>)}</div>; }
function MessageSkeleton() { return <div className="grid gap-3">{["w-2/5", "mr-auto w-3/5", "w-1/2", "mr-auto w-2/5"].map((width, index) => <div key={index} className={`h-14 animate-pulse rounded-lg bg-white/70 ${width}`} />)}</div>; }
function isNearBottom(node: HTMLDivElement | null) { return !node || node.scrollHeight - node.scrollTop - node.clientHeight < 120; }
function showDateSeparator(previous?: ChatMessage, current?: ChatMessage) { return !previous || formatDate(previous.createdAt) !== formatDate(current?.createdAt); }
function formatTime(value?: string) { return value ? new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : ""; }
function formatDate(value?: string) { return value ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value)) : ""; }
function formatConversationTime(value?: string) { if (!value) return ""; const date = new Date(value); return Date.now() - date.getTime() < 86_400_000 ? formatTime(value) : new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "numeric", day: "numeric" }).format(date); }
