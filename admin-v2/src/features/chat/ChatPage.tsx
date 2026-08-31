import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCheck,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import {
  KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, Card, EmptyState, Textarea } from "../../components/ui";
import { api } from "../../services/api";
import { normalizePersianText } from "../../lib/utils";
import type { ChatMessage, Conversation } from "../../types/domain";

type MessagePage = {
  messages: ChatMessage[];
  hasMore?: boolean;
  nextBeforeMessageId?: string;
  unread?: number;
};

export function ChatPage() {
  const [searchParams] = useSearchParams();
  const requestedStudentId = searchParams.get("studentId") || "";
  const [conversationId, setConversationId] = useState("");
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const conversations = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => api.get<Conversation[]>("/admin/chat/conversations"),
    refetchInterval: 15_000,
  });
  const filtered = useMemo(
    () =>
      (conversations.data ?? []).filter((item) =>
        normalizePersianText(item.student?.name || "").includes(
          normalizePersianText(search.trim()),
        ),
      ),
    [conversations.data, search],
  );
  const active = useMemo(
    () =>
      filtered.find((c) => c.id === conversationId) ??
      conversations.data?.find(
        (c) => String(c.student?.id || "") === requestedStudentId,
      ) ??
      filtered[0] ??
      conversations.data?.[0],
    [conversationId, conversations.data, filtered, requestedStudentId],
  );
  const messages = useQuery({
    queryKey: ["chat-messages", active?.id],
    enabled: !!active?.id,
    queryFn: () =>
      api.get<MessagePage>(
        `/chat/conversations/${active?.id}/messages?limit=100`,
      ),
    refetchInterval: 10_000,
  });
  const markRead = useMutation({
    mutationFn: () => api.post(`/chat/conversations/${active?.id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      qc.invalidateQueries({ queryKey: ["chat-messages", active?.id] });
    },
  });
  const send = useMutation({
    mutationFn: () => {
      if (!active?.id) throw new Error("گفتگویی انتخاب نشده است.");
      return api.post<ChatMessage>(
        `/chat/conversations/${active.id}/messages`,
        { text: text.trim() },
      );
    },
    onSuccess: (message) => {
      setText("");
      qc.setQueryData<MessagePage>(
        ["chat-messages", active?.id],
        (current) => ({
          ...(current || { messages: [] }),
          messages: [...(current?.messages || []), message],
        }),
      );
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });

  useEffect(() => {
    const source = api.openEvents((type, data) => {
      if (type.startsWith("chat.")) {
        qc.invalidateQueries({ queryKey: ["chat-conversations"] });
        if (active?.id && data.conversationId === active.id)
          qc.invalidateQueries({ queryKey: ["chat-messages", active.id] });
      }
    });
    return () => source.close();
  }, [active?.id, qc]);

  useEffect(() => {
    if (active?.id && !conversationId) setConversationId(active.id);
  }, [active?.id, conversationId]);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.data?.messages.length, active?.id]);

  function submit() {
    if (text.trim() && !send.isPending) send.mutate();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="grid h-[calc(100vh-132px)] min-h-[620px] gap-4 overflow-hidden">
      <section className="grid min-h-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="flex min-h-0 flex-col overflow-hidden p-0">
          <div className="border-b p-3">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} />
              <strong>گفتگوها</strong>
              {conversations.isFetching ? (
                <RefreshCw
                  className="mr-auto animate-spin text-slate-400"
                  size={15}
                />
              ) : null}
            </div>
            <label className="mt-3 flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3">
              <Search size={16} className="text-slate-400" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جستجوی دانش‌آموز"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {filtered.length ? (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setConversationId(c.id)}
                  className={`flex w-full items-center gap-3 border-b p-3 text-right hover:bg-slate-50 ${active?.id === c.id ? "bg-teal-50" : ""}`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">
                    {(c.student?.name || "د").slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate">
                      {c.student?.name || "دانش‌آموز"}
                    </strong>
                    <small className="block truncate text-slate-500">
                      {c.lastMessage?.text || "بدون پیام"}
                    </small>
                  </span>
                  {c.unread ? <Badge tone="red">{c.unread}</Badge> : null}
                </button>
              ))
            ) : (
              <EmptyState title="گفتگویی پیدا نشد." />
            )}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden p-0">
          <div className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-4">
            <div>
              <strong className="block">
                {active?.student?.name || "گفتگو"}
              </strong>
              <span className="text-xs text-slate-500">
                {active?.presence?.online ? "آنلاین" : "آماده پاسخگویی"}
              </span>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 text-xs text-slate-500"
              onClick={() => markRead.mutate()}
              disabled={!active?.id || markRead.isPending}
            >
              {markRead.isPending ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <CheckCheck size={18} />
              )}
              خوانده شد
            </button>
          </div>
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-2 overflow-auto bg-[#efeae2] p-4"
          >
            {messages.isLoading ? (
              <EmptyState title="در حال دریافت پیام‌ها..." />
            ) : null}
            {messages.data?.messages.length ? (
              messages.data.messages.map((message) => (
                <Bubble
                  key={message.id}
                  message={message}
                  mine={String(message.senderRole).toLowerCase() === "admin"}
                />
              ))
            ) : !messages.isLoading ? (
              <EmptyState title="پیامی ثبت نشده است." />
            ) : null}
          </div>
          <div className="flex gap-2 overflow-x-auto border-t bg-white px-3 pt-2">
            {[
              "برنامه امروزت را انجام دادی؟",
              "اگر بخشی از برنامه سخت بود، بگو تا اصلاحش کنم.",
              "نتیجه آزمون را برایم بفرست.",
            ].map((item) => (
              <button
                key={item}
                type="button"
                className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs"
                onClick={() => setText(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <form
            className="grid shrink-0 grid-cols-[1fr_44px] gap-2 bg-white p-3"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <Textarea
              className="max-h-28 min-h-11 resize-none py-2"
              rows={1}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="پیام..."
            />
            <button
              className="grid size-11 place-items-center rounded-md bg-brand text-white disabled:opacity-50"
              disabled={!text.trim() || send.isPending}
              aria-label="ارسال"
            >
              {send.isPending ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        </Card>
      </section>
    </div>
  );
}

function Bubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[76%] rounded-lg px-3 py-2 text-sm shadow-sm ${mine ? "bg-[#d9fdd3] text-ink" : "bg-white text-ink"}`}
      >
        <p className="whitespace-pre-wrap leading-7">{message.text}</p>
        <span
          className="mt-1 block text-left text-[11px] text-slate-400"
          dir="ltr"
        >
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

function formatTime(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
