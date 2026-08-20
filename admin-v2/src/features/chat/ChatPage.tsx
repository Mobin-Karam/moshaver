import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Input } from "../../components/ui";
import { api } from "../../services/api";
import type { ChatMessage, Conversation } from "../../types/domain";

export function ChatPage() {
  const [conversationId, setConversationId] = useState("");
  const [text, setText] = useState("");
  const qc = useQueryClient();
  const conversations = useQuery({ queryKey: ["chat-conversations"], queryFn: () => api.get<Conversation[]>("/admin/chat/conversations"), refetchInterval: 30_000 });
  const active = useMemo(() => (conversations.data ?? []).find((c) => c.id === conversationId) ?? conversations.data?.[0], [conversationId, conversations.data]);
  const messages = useQuery({ queryKey: ["chat-messages", active?.id], enabled: !!active?.id, queryFn: () => api.get<ChatMessage[]>(`/chat/conversations/${active?.id}/messages`), refetchInterval: 20_000 });
  const send = useMutation({
    mutationFn: () => {
      if (!active?.id) throw new Error("گفتگویی انتخاب نشده است.");
      return api.post<ChatMessage>(`/chat/conversations/${active.id}/messages`, { text });
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["chat-messages", active?.id] });
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });

  useEffect(() => {
    const source = api.openEvents((type, data) => {
      if (type.startsWith("chat.")) {
        qc.invalidateQueries({ queryKey: ["chat-conversations"] });
        if (active?.id && data.conversationId === active.id) qc.invalidateQueries({ queryKey: ["chat-messages", active.id] });
      }
    });
    return () => source.close();
  }, [active?.id, qc]);

  useEffect(() => {
    if (active?.id) setConversationId(active.id);
  }, [active?.id]);

  return <div className="grid gap-5"><div><h2 className="text-2xl font-black">گفتگو</h2><p className="text-slate-500">SSE موجود حفظ شده و برای همگام‌سازی گفتگو استفاده می‌شود.</p></div><section className="grid min-h-[640px] gap-4 lg:grid-cols-[320px_1fr]"><Card className="overflow-hidden p-0"><div className="border-b p-3 font-bold">دانش‌آموزان</div><div className="max-h-[590px] overflow-auto">{(conversations.data ?? []).map((c) => <button key={c.id} onClick={() => setConversationId(c.id)} className={`flex w-full items-center justify-between border-b p-3 text-right hover:bg-slate-50 ${active?.id === c.id ? "bg-teal-50" : ""}`}><span><strong className="block">{c.student?.name || "دانش‌آموز"}</strong><small className="text-slate-500">{c.lastMessage?.text || "بدون پیام"}</small></span>{c.unread ? <Badge tone="red">{c.unread}</Badge> : null}</button>)}</div></Card><Card className="flex flex-col p-0"><div className="border-b p-4"><strong>{active?.student?.name || "گفتگو"}</strong><p className="text-xs text-slate-500">{active?.presence?.online ? "آنلاین" : "آفلاین"}</p></div><div className="flex-1 space-y-3 overflow-auto bg-slate-50 p-4">{messages.data?.length ? messages.data.map((m) => <div key={m.id} className={`flex ${m.senderRole === "admin" ? "justify-start" : "justify-end"}`}><div className={`max-w-[72%] rounded-lg p-3 text-sm ${m.senderRole === "admin" ? "bg-brand text-white" : "bg-white text-ink"}`}><p>{m.text}</p><small className="opacity-70">{m.createdAt}</small></div></div>) : <EmptyState title="پیامی ثبت نشده است." />}</div><form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }}><Input value={text} onChange={(e) => setText(e.target.value)} placeholder="پیام..." /><Button disabled={!text.trim() || send.isPending}><Send size={16} />ارسال</Button></form></Card></section></div>;
}
