import { InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowRight, Check, CheckCheck, ChevronUp, LoaderCircle, MessageCircle, Pencil, RefreshCw, Reply, Search, Send, Trash2, Users, WifiOff } from "lucide-react";
import { KeyboardEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, Button, Card, EmptyState, Textarea } from "../../shared/ui/ui";
import { useModal } from "../../shared/ui/modal";
import { notify } from "../../shared/ui/notifications";
import { normalizePersianText } from "../../shared/lib/utils";
import { api } from "../../shared/api/api";
import type { ChatMessage, Conversation } from "../../shared/types/domain";
import { useAuth } from "../auth/AuthProvider";
import { CreateGroupButton, GroupInfoButton } from "./GroupChatControls";
import type { GroupDetail } from "./chat-model";

type ConversationPage = { items: Conversation[]; total: number; totalUnread: number; hasMore: boolean; nextOffset?: number };
type ConversationCursor = { directOffset: number; groupOffset: number; directDone: boolean; groupDone: boolean };
type CombinedConversationPage = { items: Conversation[]; directTotal: number; groupTotal: number; totalUnread: number; next?: ConversationCursor };
export type MessagePage = { messages: ChatMessage[]; hasMore?: boolean; nextBeforeMessageId?: string; unread?: number; otherReadAt?: string };

export function chatSearchMatch(item: Conversation, search: string) {
  const needle = normalizePersianText(search).trim().toLocaleLowerCase("fa");
  if (!needle) return true;
  return normalizePersianText(`${item.student?.name || ""} ${item.student?.grade || ""} ${item.title || ""} ${item.description || ""} ${item.lastMessage?.text || ""}`).toLocaleLowerCase("fa").includes(needle);
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

export function sortConversations(items: Conversation[]) {
  return [...items].sort((a, b) => conversationActivity(b) - conversationActivity(a));
}

export function canUseMessageAction(action: "edit" | "delete" | "react", mine: boolean, group?: GroupDetail) {
  if (!group) return action === "react" || mine;
  if (action === "react") return group.myRole !== "member" || !!group.permissions.members_can_react;
  if (action === "edit") return mine && (group.myRole !== "member" || !!group.permissions.members_can_edit_own_messages);
  if (mine) return group.myRole !== "member" || !!group.permissions.members_can_delete_own_messages;
  return group.myRole !== "member" && !!group.permissions.admins_can_delete_messages;
}

export function ChatPage() {
  const auth = useAuth();
  const modal = useModal();
  const [params, setParams] = useSearchParams();
  const requestedStudentId = params.get("studentId") || "";
  const requestedConversationId = params.get("conversationId") || "";
  const [conversationId, setConversationId] = useState(requestedConversationId);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showMessages, setShowMessages] = useState(!!requestedConversationId || !!requestedStudentId);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDebouncedValue(search.trim(), 250);
  const [conversationFilter, setConversationFilter] = useState<"all" | "unread" | "direct" | "group">("all");
  const [newMessageCount, setNewMessageCount] = useState(0);
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const shouldStickRef = useRef(true);
  const historyHeightRef = useRef<number | null>(null);

  const conversations = useInfiniteQuery<CombinedConversationPage, Error, InfiniteData<CombinedConversationPage>, string[], ConversationCursor>({
    queryKey: ["chat-conversations", deferredSearch],
    initialPageParam: { directOffset: 0, groupOffset: 0, directDone: false, groupDone: false },
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as ConversationCursor;
      const suffix = deferredSearch ? `&search=${encodeURIComponent(deferredSearch)}` : "";
      const [directResult, groupResult] = await Promise.all([
        cursor.directDone ? Promise.resolve<ConversationPage>({ items: [], total: 0, totalUnread: 0, hasMore: false }) : api.get<ConversationPage | Conversation[]>(`/admin/chat/conversations?limit=40&offset=${cursor.directOffset}${suffix}`),
        cursor.groupDone ? Promise.resolve<ConversationPage>({ items: [], total: 0, totalUnread: 0, hasMore: false }) : api.get<ConversationPage>(`/chat/conversations?limit=40&offset=${cursor.groupOffset}${suffix}`),
      ]);
      const direct = Array.isArray(directResult) ? { items: directResult, total: directResult.length, totalUnread: directResult.reduce((sum, item) => sum + Number(item.unread || 0), 0), hasMore: false } : directResult;
      const groups = groupResult.items ?? [];
      const directDone = cursor.directDone || !direct.hasMore;
      const groupDone = cursor.groupDone || !groupResult.hasMore;
      return {
        items: sortConversations([...direct.items, ...groups]),
        directTotal: cursor.directDone ? 0 : direct.total,
        groupTotal: cursor.groupDone ? 0 : groupResult.total,
        totalUnread: direct.totalUnread + groups.reduce((sum, item) => sum + Number(item.unread || 0), 0),
        next: directDone && groupDone ? undefined : { directOffset: cursor.directOffset + direct.items.length, groupOffset: cursor.groupOffset + groups.length, directDone, groupDone },
      } satisfies CombinedConversationPage;
    },
    getNextPageParam: (page) => page.next,
    refetchInterval: 30_000,
  });
  const allConversations = useMemo(() => {
    const seen = new Set<string>();
    return sortConversations((conversations.data?.pages ?? []).flatMap((page) => page.items).filter((item) => !seen.has(item.id) && !!seen.add(item.id)));
  }, [conversations.data]);
  const filtered = useMemo(() => allConversations.filter((item) => conversationFilter === "all" || (conversationFilter === "unread" ? !!item.unread : item.type === conversationFilter)), [allConversations, conversationFilter]);
  const totalConversations = conversations.data?.pages[0] ? conversations.data.pages[0].directTotal + conversations.data.pages[0].groupTotal : allConversations.length;
  const totalUnread = allConversations.reduce((sum, item) => sum + Number(item.unread || 0), 0);
  const active = useMemo(() =>
    allConversations.find((item) => item.id === conversationId) ??
    allConversations.find((item) => item.id === requestedConversationId) ??
    allConversations.find((item) => String(item.student?.id || "") === requestedStudentId) ??
    (selectedConversation?.id === conversationId ? selectedConversation : undefined) ??
    allConversations[0],
  [allConversations, conversationId, requestedConversationId, requestedStudentId, selectedConversation]);

  const messages = useInfiniteQuery({
    queryKey: ["chat-messages", active?.id],
    enabled: !!active?.id,
    initialPageParam: "",
    queryFn: ({ pageParam }) => api.get<MessagePage>(`/chat/conversations/${active?.id}/messages?limit=50${pageParam ? `&beforeMessageId=${encodeURIComponent(pageParam)}` : ""}`),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextBeforeMessageId : undefined,
    refetchInterval: 20_000,
  });
  const messageItems = useMemo(() => mergeMessagePages(messages.data), [messages.data]);
  const groupDetail = useQuery({ queryKey: ["chat-group", active?.id], enabled: active?.type === "group", queryFn: () => api.get<GroupDetail>(`/chat/conversations/${active?.id}`) });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/chat/conversations/${id}/read`, {}),
    onSuccess: (_, id) => qc.setQueriesData<InfiniteData<CombinedConversationPage>>({ queryKey: ["chat-conversations"] }, (current) => current ? ({ ...current, pages: current.pages.map((page) => ({ ...page, items: page.items.map((item) => item.id === id ? { ...item, unread: 0 } : item) })) }) : current),
  });
  const send = useMutation({
    mutationFn: ({ id, body, replyToId, editingId }: { id: string; body: string; replyToId?: string; editingId?: string }) => editingId ? api.patch<ChatMessage>(`/chat/messages/${editingId}`, { text: body }) : api.post<ChatMessage>(`/chat/conversations/${id}/messages`, { text: body, replyToId }),
    onMutate: async ({ id, body, replyToId, editingId }) => {
      const key = ["chat-messages", id] as const;
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<InfiniteData<MessagePage>>(key);
      const pendingId = `pending-${crypto.randomUUID()}`;
      if (!editingId) {
        const optimistic: ChatMessage = { id: pendingId, text: body, senderRole: "admin", senderUserId: auth.user?.id, createdAt: new Date().toISOString(), pending: true, replyToId };
        qc.setQueryData<InfiniteData<MessagePage>>(key, (current) => {
          if (!current?.pages.length) return { pages: [{ messages: [optimistic] }], pageParams: [""] };
          const pages = [...current.pages];
          pages[0] = { ...pages[0], messages: [...pages[0].messages, optimistic] };
          return { ...current, pages };
        });
      }
      shouldStickRef.current = true;
      setText("");
      persistDraft(id, "");
      setReplyTo(null); setEditing(null);
      return { previous, key, body, pendingId, editingId };
    },
    onSuccess: (message, _, context) => {
      if (!context) return;
      qc.setQueryData<InfiniteData<MessagePage>>(context.key, (current) => current ? { ...current, pages: current.pages.map((page) => ({ ...page, messages: page.messages.map((item) => item.id === context.pendingId || item.id === context.editingId ? message : item) })) } : current);
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: (error, _, context) => {
      if (context?.previous) qc.setQueryData(context.key, context.previous);
      if (context?.body) { setText(context.body); persistDraft(active?.id, context.body); }
      if (context?.editingId && context.previous) setEditing(mergeMessagePages(context.previous).find((item) => item.id === context.editingId) || null);
      notify(error instanceof Error ? error.message : "ارسال پیام ناموفق بود.", "error");
    },
  });
  const messageAction = useMutation({
    mutationFn: ({ method, path, body }: { method: "post" | "delete"; path: string; body?: unknown }) => method === "post" ? api.post(path, body) : api.delete(path),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["chat-messages", active?.id] }),
    onError: (error) => notify(error instanceof Error ? error.message : "عملیات پیام ناموفق بود.", "error"),
  });

  useEffect(() => {
    const source = api.openEvents((type, data) => {
      if (!type.startsWith("chat.")) return;
      if (active?.id && data.conversationId === active.id) {
        const nearBottom = isNearBottom(scrollRef.current);
        shouldStickRef.current = nearBottom;
        if (type === "chat.message.created" && data.id) appendRealtimeMessage(qc, active.id, data as unknown as ChatMessage);
        else if (type === "chat.message.edited" && data.id) replaceRealtimeMessage(qc, active.id, data as unknown as ChatMessage);
        else if (type === "chat.message.deleted" && data.id) patchDeletedMessage(qc, active.id, String(data.id), String(data.deletedAt || ""));
        else void qc.invalidateQueries({ queryKey: ["chat-messages", active.id] });
        if (!nearBottom && type === "chat.message.created") setNewMessageCount((count) => count + 1);
      }
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    });
    return () => source.close();
  }, [active?.id, qc]);

  useEffect(() => {
    if (!active?.id || !showMessages) return;
    if (conversationId !== active.id) setConversationId(active.id);
    setParams((current) => {
      current.set("conversationId", active.id);
      if (active.student?.id) current.set("studentId", active.student.id);
      else current.delete("studentId");
      return current;
    }, { replace: true });
  }, [active?.id, showMessages]);

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
    setSelectedConversation(item);
    persistDraft(active?.id, text);
    setReplyTo(null); setEditing(null); setText(readDraft(item.id)); setNewMessageCount(0);
    setParams((current) => {
      current.set("conversationId", item.id);
      if (item.student?.id) current.set("studentId", item.student.id);
      else current.delete("studentId");
      return current;
    });
  }
  function submit() {
    const body = text.trim();
    if (body && active?.id && !send.isPending) send.mutate({ id: active.id, body, replyToId: replyTo?.id, editingId: editing?.id });
  }
  function loadOlder() {
    if (!scrollRef.current || !messages.hasNextPage || messages.isFetchingNextPage) return;
    historyHeightRef.current = scrollRef.current.scrollHeight;
    void messages.fetchNextPage();
  }

  return (
    <div className="grid h-[calc(100dvh-132px)] min-h-0 overflow-hidden lg:h-[calc(100dvh-96px)]">
      <section className="grid min-h-0 gap-3 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <Card className={`${showMessages ? "hidden lg:flex" : "flex"} min-h-0 flex-col overflow-hidden p-0`}>
          <div className="border-b p-3">
            <div className="flex flex-wrap items-center gap-2"><MessageCircle size={18} /><strong>گفتگوها</strong><Badge tone="blue">{totalConversations}</Badge>{totalUnread ? <Badge tone="red">{toFa(totalUnread)} خوانده‌نشده</Badge> : null}<span className="mr-auto"><CreateGroupButton onCreated={(id) => { void conversations.refetch().then(() => { setConversationId(id); setShowMessages(true); }); }} /></span>{conversations.isFetching && !conversations.isFetchingNextPage ? <RefreshCw className="animate-spin text-slate-400" size={15} /> : null}</div>
            <label className="mt-3 flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3"><Search size={16} className="text-slate-400" /><input className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="نام، پایه یا متن آخرین پیام" aria-label="جستجوی گفتگوها" /></label>
            <div className="mt-2 flex gap-1 overflow-x-auto" aria-label="فیلتر گفتگوها">{([['all','همه'],['unread','خوانده‌نشده'],['direct','دانش‌آموزان'],['group','گروه‌ها']] as const).map(([value,label]) => <button type="button" key={value} aria-pressed={conversationFilter === value} onClick={() => setConversationFilter(value)} className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${conversationFilter === value ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>)}</div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {conversations.isLoading ? <ConversationSkeleton /> : conversations.isError ? <EmptyState title="دریافت گفتگوها ناموفق بود." action={<Button variant="soft" onClick={() => void conversations.refetch()}>تلاش دوباره</Button>} /> : filtered.length ? filtered.map((item) => (
              <button key={item.id} onClick={() => selectConversation(item)} style={{ contentVisibility: "auto", containIntrinsicSize: "64px" }} className={`flex w-full items-center gap-3 border-b p-3 text-right transition hover:bg-slate-50 ${active?.id === item.id ? "bg-teal-50" : ""}`}>
                <span className={`relative grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${item.type === "group" ? "bg-indigo-600" : "bg-brand"}`}>{item.type === "group" ? <Users size={18} /> : (item.student?.name || "د").slice(0, 1)}{item.presence?.online ? <i className="absolute bottom-0 left-0 size-3 rounded-full border-2 border-white bg-emerald-500" /> : null}</span>
                <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><strong className="truncate">{item.type === "group" ? item.title : item.student?.name || "دانش‌آموز"}</strong><small className="shrink-0 text-[10px] text-slate-400">{formatConversationTime(item.lastMessage?.createdAt)}</small></span><small className="mt-1 block truncate text-slate-500">{item.lastMessage?.type && item.lastMessage.type !== "text" ? "پیام ساختاریافته" : item.lastMessage?.text || "هنوز پیامی ثبت نشده"}</small></span>
                {item.unread ? <Badge tone="red">{item.unread}</Badge> : null}
              </button>
            )) : <EmptyState title={search || conversationFilter !== "all" ? "گفتگویی مطابق جستجو و فیلتر نیست." : "گفتگویی وجود ندارد."} />}
            {conversations.hasNextPage ? <div className="p-3"><Button className="w-full" variant="soft" loading={conversations.isFetchingNextPage} onClick={() => void conversations.fetchNextPage()}>گفتگوهای بیشتر</Button></div> : null}
          </div>
        </Card>

        <Card className={`${showMessages ? "flex" : "hidden lg:flex"} min-h-0 flex-col overflow-hidden p-0`}>
          {active ? <>
            <div className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2"><button className="grid size-9 shrink-0 place-items-center rounded-md hover:bg-slate-100 lg:hidden" aria-label="بازگشت به گفتگوها" onClick={() => { setShowMessages(false); setParams((current) => { current.delete("conversationId"); current.delete("studentId"); return current; }); }}><ArrowRight size={19} /></button><div className="min-w-0"><strong className="block truncate">{active.type === "group" ? active.title : active.student?.name || "گفتگو"}</strong><span className={`text-xs ${active.presence?.online ? "text-emerald-600" : "text-slate-500"}`}>{active.type === "group" ? `${active.memberCount || groupDetail.data?.memberCount || 0} عضو • ${groupDetail.isLoading ? "در حال دریافت نقش" : groupDetail.data?.myRole === "owner" ? "مالک" : groupDetail.data?.myRole === "admin" ? "مدیر" : "عضو"}` : active.presence?.online ? "آنلاین" : active.student?.grade || "آفلاین"}</span></div></div>
              <div className="flex items-center gap-1">{active.type === "group" ? <GroupInfoButton conversationId={active.id} onChanged={() => void conversations.refetch()} /> : null}<button type="button" className="flex shrink-0 items-center gap-1 text-xs text-slate-500" onClick={() => markRead.mutate(active.id)} disabled={markRead.isPending || !active.unread}>{markRead.isPending ? <LoaderCircle size={17} className="animate-spin" /> : <CheckCheck size={17} />}<span className="hidden sm:inline">خوانده شد</span></button></div>
            </div>
            <div ref={scrollRef} onScroll={(event) => { const nearBottom = isNearBottom(event.currentTarget); shouldStickRef.current = nearBottom; if (nearBottom) setNewMessageCount(0); }} className="min-h-0 flex-1 space-y-2 overflow-auto bg-[#efeae2] p-3 sm:p-4">
              {messages.hasNextPage ? <div className="flex justify-center"><Button className="h-8" variant="soft" loading={messages.isFetchingNextPage} onClick={loadOlder}><ChevronUp size={15} /> پیام‌های قدیمی‌تر</Button></div> : null}
              {messages.isLoading ? <MessageSkeleton /> : messages.isError ? <EmptyState title="دریافت پیام‌ها ناموفق بود." action={<Button variant="soft" onClick={() => void messages.refetch()}><WifiOff size={15} /> تلاش دوباره</Button>} /> : messageItems.length ? <MessageList items={messageItems} authUserId={auth.user?.id} isGroup={active.type === "group"} group={groupDetail.data} setReplyTo={(message) => { setReplyTo(message); setEditing(null); }} setEditing={(message) => { setEditing(message); setReplyTo(null); setText(message.text); }} act={(method, path, body) => { if (method === "delete" && !path.includes("/reactions/")) void modal.confirm({ title: "حذف پیام؟", description: "متن پیام برای اعضای گفتگو حذف خواهد شد.", tone: "danger", confirmLabel: "حذف پیام" }).then((ok) => { if (ok) messageAction.mutate({ method, path, body }); }); else messageAction.mutate({ method, path, body }); }} /> : <EmptyState title="هنوز پیامی ثبت نشده است." />}
              {newMessageCount ? <button type="button" className="sticky bottom-2 mx-auto flex items-center gap-1 rounded-full bg-brand px-3 py-2 text-xs font-bold text-white shadow-lg" onClick={() => { const node = scrollRef.current; if (node) node.scrollTop = node.scrollHeight; shouldStickRef.current = true; setNewMessageCount(0); }}><ArrowDown size={15} /> {toFa(newMessageCount)} پیام جدید</button> : null}
            </div>
            <div className="flex gap-2 overflow-x-auto border-t bg-white px-3 pt-2">{["برنامه امروزت را انجام دادی؟", "اگر بخشی سخت بود، بگو تا اصلاحش کنم.", "نتیجه آزمون را برایم بفرست."].map((item) => <button key={item} type="button" className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs hover:bg-slate-200" onClick={() => setText((current) => current.trim() ? `${current.trim()}\n${item}` : item)}>{item}</button>)}</div>
            {replyTo || editing ? <div className="flex items-center gap-2 border-t bg-sky-50 px-3 py-2 text-xs text-sky-900"><span className="min-w-0 flex-1 truncate">{editing ? `ویرایش: ${editing.text}` : `پاسخ به ${replyTo?.senderName || "پیام"}: ${replyTo?.text || "پیام ساختاریافته"}`}</span><button onClick={() => { setReplyTo(null); setEditing(null); if (editing) setText(""); }}>×</button></div> : null}
            <form className="grid shrink-0 grid-cols-[minmax(0,1fr)_44px] gap-2 bg-white p-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
              <div><Textarea aria-label="متن پیام" className="max-h-28 min-h-11 resize-none py-2" rows={1} maxLength={3000} value={text} onChange={(event) => { setText(event.target.value); persistDraft(active.id, event.target.value); }} onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="پیام… (Shift+Enter برای خط جدید)" disabled={active.type === "group" && groupDetail.data?.myRole === "member" && !groupDetail.data.permissions.members_can_send_messages} /><span className={`mt-1 block text-left text-[10px] ${text.length > 2800 ? "text-amber-700" : "text-slate-400"}`} dir="ltr">{text.length}/3000</span></div>
              <button className="grid size-11 place-items-center rounded-md bg-brand text-white disabled:opacity-50" disabled={!text.trim() || send.isPending || (active.type === "group" && groupDetail.data?.myRole === "member" && !groupDetail.data.permissions.members_can_send_messages)} aria-label="ارسال پیام">{send.isPending ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}</button>
            </form>
          </> : <EmptyState title="یک گفتگو را انتخاب کنید." />}
        </Card>
      </section>
    </div>
  );
}

function MessageList({ items, authUserId, isGroup, group, setReplyTo, setEditing, act }: { items: ChatMessage[]; authUserId?: string; isGroup: boolean; group?: GroupDetail; setReplyTo: (message: ChatMessage) => void; setEditing: (message: ChatMessage) => void; act: (method: "post" | "delete", path: string, body?: unknown) => void }) {
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  return items.map((message, index) => {
    const mine = message.senderUserId ? message.senderUserId === authUserId : !isGroup && String(message.senderRole).toLowerCase() === "admin";
    const canEdit = !message.deletedAt && (!isGroup || !!group) && canUseMessageAction("edit", mine, group);
    const canDelete = !message.deletedAt && (!isGroup || !!group) && canUseMessageAction("delete", mine, group);
    const canReact = !message.deletedAt && (!isGroup || !!group) && canUseMessageAction("react", mine, group);
    return <div key={message.id} style={{ contentVisibility: "auto", containIntrinsicSize: "72px" }}>{showDateSeparator(items[index - 1], message) ? <div className="my-3 text-center"><span className="rounded-full bg-white/80 px-3 py-1 text-[11px] text-slate-500 shadow-sm">{formatDate(message.createdAt)}</span></div> : null}<Bubble message={message} mine={mine} group={isGroup} referenced={message.replyToId ? byId.get(message.replyToId) : undefined} onReply={() => setReplyTo(message)} onEdit={canEdit ? () => setEditing(message) : undefined} onDelete={canDelete ? () => act("delete", `/chat/messages/${message.id}`) : undefined} onReact={canReact ? (emoji, remove) => act(remove ? "delete" : "post", `/chat/messages/${message.id}/reactions${remove ? `/${encodeURIComponent(emoji)}` : ""}`, remove ? undefined : { emoji }) : undefined} /></div>;
  });
}

function Bubble({ message, mine, group, referenced, onReply, onEdit, onDelete, onReact }: { message: ChatMessage; mine: boolean; group: boolean; referenced?: ChatMessage; onReply: () => void; onEdit?: () => void; onDelete?: () => void; onReact?: (emoji: string, remove: boolean) => void }) {
  if (message.type === "system") return <div className="my-2 text-center"><span className="rounded-full bg-slate-700/75 px-3 py-1 text-xs text-white">{message.text}</span></div>;
  const reacted = (emoji: string) => !!message.reactions?.find((item) => item.emoji === emoji)?.reacted;
  return <div className={`group/message flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-lg px-3 py-2 text-sm shadow-sm sm:max-w-[76%] ${mine ? "bg-[#d9fdd3]" : "bg-white"} ${message.pending ? "opacity-70" : ""}`}>
    {group && !mine ? <strong className="mb-1 block text-xs text-indigo-700">{message.senderName || "عضو گروه"}</strong> : null}
    {message.replyToId ? <div className="mb-2 rounded border-r-2 border-brand bg-black/5 px-2 py-1 text-xs text-slate-600">↩ {referenced ? `${referenced.senderName || "عضو"}: ${referenced.text || "پیام ساختاریافته"}` : "پیام قبلی"}</div> : null}
    <MessageBody message={message} />
    {message.reactions?.length ? <div className="mt-2 flex flex-wrap gap-1">{message.reactions.map((reaction) => <button type="button" key={reaction.emoji} aria-label={`${reaction.emoji}، ${toFa(reaction.count)} واکنش`} disabled={!onReact} className={`rounded-full border px-2 py-0.5 text-xs disabled:cursor-default ${reaction.reacted ? "border-brand bg-teal-50" : "bg-white"}`} onClick={() => onReact?.(reaction.emoji, !!reaction.reacted)}>{reaction.emoji} {toFa(reaction.count)}</button>)}</div> : null}
    <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400" dir="ltr">{message.pending ? "در حال ارسال" : formatTime(message.createdAt)}{message.editedAt ? " • ویرایش‌شده" : ""}{mine && !message.pending ? message.seen ? <CheckCheck size={13} className="text-sky-600" /> : <Check size={13} /> : null}</span>
    {!message.pending ? <div className="mt-1 flex items-center justify-end gap-2 border-t border-black/5 pt-1 text-[11px] text-slate-500 opacity-100 sm:opacity-0 sm:transition sm:group-hover/message:opacity-100"><button type="button" aria-label="پاسخ به پیام" onClick={onReply}><Reply size={13} /></button>{onReact ? ["❤️", "👍", "👏"].map((emoji) => <button type="button" aria-label={`واکنش ${emoji}`} key={emoji} onClick={() => onReact(emoji, reacted(emoji))}>{emoji}</button>) : null}{onEdit ? <button type="button" aria-label="ویرایش پیام" onClick={onEdit}><Pencil size={13} /></button> : null}{onDelete ? <button type="button" aria-label="حذف پیام" className="text-rose-700" onClick={onDelete}><Trash2 size={13} /></button> : null}</div> : null}
  </div></div>;
}

function MessageBody({ message }: { message: ChatMessage }) {
  if (message.deletedAt) return <p className="italic text-slate-400">پیام حذف شده است.</p>;
  const payload = message.payload || {};
  if (message.type && !["text", "system"].includes(message.type)) {
    const labels: Record<string, string> = { study_state: "📚 وضعیت مطالعه", exam_result: "📊 نتیجه آزمون", study_time: "⏱ زمان مطالعه", current_activity: "📖 فعالیت فعلی", learning_item: "🔁 مورد یادگیری" };
    return <div className="grid gap-1 rounded-md border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-950"><strong>{labels[message.type] || "اشتراک دانش‌آموز"}</strong>{payload.title ? <b>{String(payload.title)}</b> : null}{payload.subject ? <span>درس: {String(payload.subject)}</span> : null}{payload.percent != null ? <span>نتیجه: {String(payload.percent)}٪</span> : null}{payload.studyMinutes != null ? <span>مطالعه امروز: {String(payload.studyMinutes)} دقیقه</span> : null}{payload.totalMinutes != null ? <span>مجموع مطالعه: {String(payload.totalMinutes)} دقیقه</span> : null}{payload.testCount != null ? <span>تعداد تست: {String(payload.testCount)}</span> : null}{payload.reviews != null ? <span>مرورهای سررسید: {String(payload.reviews)}</span> : null}{payload.minutes != null ? <span>مدت: {String(payload.minutes)} دقیقه</span> : null}</div>;
  }
  return <p className="whitespace-pre-wrap break-words leading-7">{message.text}</p>;
}
function ConversationSkeleton() { return <div className="grid gap-px">{[1,2,3,4,5].map((item) => <div key={item} className="flex gap-3 p-3"><span className="size-10 animate-pulse rounded-full bg-slate-100" /><span className="grid flex-1 gap-2"><i className="h-4 w-1/2 animate-pulse rounded bg-slate-100" /><i className="h-3 w-4/5 animate-pulse rounded bg-slate-100" /></span></div>)}</div>; }
function MessageSkeleton() { return <div className="grid gap-3">{["w-2/5", "mr-auto w-3/5", "w-1/2", "mr-auto w-2/5"].map((width, index) => <div key={index} className={`h-14 animate-pulse rounded-lg bg-white/70 ${width}`} />)}</div>; }
function isNearBottom(node: HTMLDivElement | null) { return !node || node.scrollHeight - node.scrollTop - node.clientHeight < 120; }
function showDateSeparator(previous?: ChatMessage, current?: ChatMessage) { return !previous || formatDate(previous.createdAt) !== formatDate(current?.createdAt); }
function formatTime(value?: string) { return value ? new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : ""; }
function formatDate(value?: string) { return value ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value)) : ""; }
function formatConversationTime(value?: string) { if (!value) return ""; const date = new Date(value); return Date.now() - date.getTime() < 86_400_000 ? formatTime(value) : new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "numeric", day: "numeric" }).format(date); }
function conversationActivity(item: Conversation) { return item.lastMessage?.createdAt ? new Date(item.lastMessage.createdAt).getTime() : 0; }
function toFa(value: number) { return new Intl.NumberFormat("fa-IR").format(value); }
function draftKey(id: string) { return `admin-chat-draft:${id}`; }
function readDraft(id: string) { try { return sessionStorage.getItem(draftKey(id)) || ""; } catch { return ""; } }
function persistDraft(id: string | undefined, value: string) { if (!id) return; try { if (value.trim()) sessionStorage.setItem(draftKey(id), value); else sessionStorage.removeItem(draftKey(id)); } catch { /* storage can be unavailable */ } }
function appendRealtimeMessage(qc: ReturnType<typeof useQueryClient>, conversationId: string, message: ChatMessage) { qc.setQueryData<InfiniteData<MessagePage>>(["chat-messages", conversationId], (current) => { if (!current?.pages.length || current.pages.some((page) => page.messages.some((item) => item.id === message.id))) return current; const pages = [...current.pages]; pages[0] = { ...pages[0], messages: [...pages[0].messages, message] }; return { ...current, pages }; }); }
function replaceRealtimeMessage(qc: ReturnType<typeof useQueryClient>, conversationId: string, message: ChatMessage) { qc.setQueryData<InfiniteData<MessagePage>>(["chat-messages", conversationId], (current) => current ? ({ ...current, pages: current.pages.map((page) => ({ ...page, messages: page.messages.map((item) => item.id === message.id ? message : item) })) }) : current); }
function patchDeletedMessage(qc: ReturnType<typeof useQueryClient>, conversationId: string, id: string, deletedAt: string) { qc.setQueryData<InfiniteData<MessagePage>>(["chat-messages", conversationId], (current) => current ? ({ ...current, pages: current.pages.map((page) => ({ ...page, messages: page.messages.map((item) => item.id === id ? { ...item, text: "", deletedAt } : item) })) }) : current); }
function useDebouncedValue<T>(value: T, delay: number) { const [debounced, setDebounced] = useState(value); useEffect(() => { const timer = window.setTimeout(() => setDebounced(value), delay); return () => window.clearTimeout(timer); }, [value, delay]); return debounced; }
