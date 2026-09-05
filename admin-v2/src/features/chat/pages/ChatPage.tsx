import {
  InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { ArrowDown, ChevronUp, WifiOff } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button, Card, EmptyState } from "../../../shared/ui/ui";
import { useModal } from "../../../shared/ui/modal";
import { notify } from "../../../shared/ui/notifications";
import { api } from "../../../shared/api/api";
import type { ChatMessage, Conversation } from "../../../shared/types/domain";
import { useAuth } from "../../auth/AuthProvider";
import { MessageComposer } from "../components/composer/MessageComposer";
import { ConversationSidebar } from "../components/conversation/ConversationSidebar";
import {
  MessageList,
  MessageSkeleton,
} from "../components/messages/MessageList";
import { ChatHeader } from "../components/messages/ChatHeader";
import { MessageSearchBar } from "../components/messages/MessageSearchBar";
import { chatApi } from "../api/chat.api";
import { useChatSelectionParams } from "../hooks/useChatSelection";
import { useConversation } from "../hooks/useConversation";
import { useConversationFavorites } from "../hooks/useConversationFavorites";
import { useConversations } from "../hooks/useConversations";
import { useMessageActions } from "../hooks/useMessageActions";
import { useMessageSearch } from "../hooks/useMessageSearch";
import { useMessages } from "../hooks/useMessages";
import {
  isNearBottom,
  mergeMessagePages,
  persistDraft,
  readDraft,
} from "../lib/chat-helpers";
import {
  persistConversationScroll,
  readConversationScroll,
} from "../lib/chat-ui-storage";
import { toFa } from "../lib/chat-formatters";
import type {
  CombinedConversationPage,
  ConversationFilter,
  ConversationSort,
  MessagePage,
} from "../model/chat.types";

export function ChatPage() {
  const auth = useAuth();
  const modal = useModal();
  const selection = useChatSelectionParams();
  const { requestedStudentId, requestedConversationId } = selection;
  const [conversationId, setConversationId] = useState(requestedConversationId);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [showMessages, setShowMessages] = useState(
    !!requestedConversationId || !!requestedStudentId,
  );
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDebouncedValue(search.trim(), 250);
  const [conversationFilter, setConversationFilter] =
    useState<ConversationFilter>("all");
  const [conversationSort, setConversationSort] =
    useState<ConversationSort>("recent");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string>();
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const olderSentinelRef = useRef<HTMLDivElement | null>(null);
  const olderRequestRef = useRef(false);
  const shouldStickRef = useRef(true);
  const historyHeightRef = useRef<number | null>(null);
  const restoredConversationRef = useRef("");
  const highlightTimerRef = useRef<number | undefined>();
  const { favorites, toggleFavorite } = useConversationFavorites();

  const conversations = useConversations(deferredSearch);
  const allConversations = conversations.items;

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      for (const item of allConversations)
        if (!(item.id in next)) next[item.id] = readDraft(item.id);
      return next;
    });
  }, [allConversations]);

  const filtered = useMemo(() => {
    const items = allConversations.filter((item) => {
      if (conversationFilter === "all") return true;
      if (conversationFilter === "unread") return !!item.unread;
      if (conversationFilter === "favorites") return favorites.has(item.id);
      if (conversationFilter === "drafts") return !!drafts[item.id]?.trim();
      if (conversationFilter === "online") return !!item.presence?.online;
      return item.type === conversationFilter;
    });
    return [...items].sort((a, b) => {
      if (conversationSort === "unread")
        return (
          Number(!!b.unread) - Number(!!a.unread) || activity(b) - activity(a)
        );
      if (conversationSort === "online")
        return (
          Number(!!b.presence?.online) - Number(!!a.presence?.online) ||
          activity(b) - activity(a)
        );
      if (conversationSort === "name")
        return conversationName(a).localeCompare(conversationName(b), "fa");
      return activity(b) - activity(a);
    });
  }, [
    allConversations,
    conversationFilter,
    conversationSort,
    favorites,
    drafts,
  ]);

  const totalConversations = conversations.total;
  const totalUnread = conversations.unread;
  const active = useMemo(
    () =>
      allConversations.find((item) => item.id === conversationId) ??
      allConversations.find((item) => item.id === requestedConversationId) ??
      allConversations.find(
        (item) => String(item.student?.id || "") === requestedStudentId,
      ) ??
      (selectedConversation?.id === conversationId
        ? selectedConversation
        : undefined) ??
      allConversations[0],
    [
      allConversations,
      conversationId,
      requestedConversationId,
      requestedStudentId,
      selectedConversation,
    ],
  );

  const messages = useMessages(active?.id);
  const messageItems = messages.items;
  const messageSearch = useMessageSearch(messageItems, active?.id);
  const groupDetail = useConversation(active?.id, active?.type === "group");

  const markRead = useMutation({
    mutationFn: chatApi.markRead,
    onSuccess: (_, id) =>
      qc.setQueriesData<InfiniteData<CombinedConversationPage>>(
        { queryKey: ["chat-conversations"] },
        (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  items: page.items.map((item) =>
                    item.id === id ? { ...item, unread: 0 } : item,
                  ),
                })),
              }
            : current,
      ),
  });

  const send = useMutation({
    mutationFn: ({
      id,
      body,
      replyToId,
      editingId,
    }: {
      id: string;
      body: string;
      replyToId?: string;
      editingId?: string;
    }) =>
      editingId
        ? api.patch<ChatMessage>(`/chat/messages/${editingId}`, { text: body })
        : api.post<ChatMessage>(`/chat/conversations/${id}/messages`, {
            text: body,
            replyToId,
          }),
    onMutate: async ({ id, body, replyToId, editingId }) => {
      const key = ["chat-messages", id] as const;
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<InfiniteData<MessagePage>>(key);
      const pendingId = `pending-${crypto.randomUUID()}`;
      if (!editingId) {
        const optimistic: ChatMessage = {
          id: pendingId,
          text: body,
          senderRole: "admin",
          senderUserId: auth.user?.id,
          createdAt: new Date().toISOString(),
          pending: true,
          replyToId,
        };
        qc.setQueryData<InfiniteData<MessagePage>>(key, (current) => {
          if (!current?.pages.length)
            return { pages: [{ messages: [optimistic] }], pageParams: [""] };
          const pages = [...current.pages];
          pages[0] = {
            ...pages[0],
            messages: [...pages[0].messages, optimistic],
          };
          return { ...current, pages };
        });
      }
      shouldStickRef.current = true;
      setText("");
      setDrafts((current) => ({ ...current, [id]: "" }));
      persistDraft(id, "");
      setReplyTo(null);
      setEditing(null);
      return { previous, key, body, pendingId, editingId };
    },
    onSuccess: (message, _, context) => {
      if (!context) return;
      qc.setQueryData<InfiniteData<MessagePage>>(context.key, (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                messages: page.messages.map((item) =>
                  item.id === context.pendingId || item.id === context.editingId
                    ? message
                    : item,
                ),
              })),
            }
          : current,
      );
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: (error, variables, context) => {
      if (context?.previous) qc.setQueryData(context.key, context.previous);
      if (context?.body) {
        setText(context.body);
        setDrafts((current) => ({ ...current, [variables.id]: context.body }));
        persistDraft(variables.id, context.body);
      }
      if (context?.editingId && context.previous)
        setEditing(
          mergeMessagePages(context.previous).find(
            (item) => item.id === context.editingId,
          ) || null,
        );
      notify(
        error instanceof Error ? error.message : "ارسال پیام ناموفق بود.",
        "error",
      );
    },
  });
  const messageAction = useMessageActions(active?.id);

  useEffect(() => {
    const source = api.openEvents((type, data) => {
      if (!type.startsWith("chat.")) return;
      if (active?.id && data.conversationId === active.id) {
        const nearBottom = isNearBottom(scrollRef.current);
        shouldStickRef.current = nearBottom;
        if (type === "chat.message.created" && data.id)
          appendRealtimeMessage(qc, active.id, data as unknown as ChatMessage);
        else if (type === "chat.message.edited" && data.id)
          replaceRealtimeMessage(qc, active.id, data as unknown as ChatMessage);
        else if (type === "chat.message.deleted" && data.id)
          patchDeletedMessage(
            qc,
            active.id,
            String(data.id),
            String(data.deletedAt || ""),
          );
        else
          void qc.invalidateQueries({ queryKey: ["chat-messages", active.id] });
        if (!nearBottom && type === "chat.message.created")
          setNewMessageCount((count) => count + 1);
      }
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    });
    return () => source.close();
  }, [active?.id, qc]);

  useEffect(() => {
    if (!active?.id || !showMessages) return;
    if (conversationId !== active.id) setConversationId(active.id);
    selection.select(active.id, active.student?.id, true);
  }, [active?.id, showMessages]);

  useEffect(() => {
    if (
      active?.id &&
      active.unread &&
      messages.isSuccess &&
      !markRead.isPending
    )
      markRead.mutate(active.id);
  }, [active?.id, active?.unread, messages.isSuccess]);

  useEffect(() => {
    shouldStickRef.current = true;
    historyHeightRef.current = null;
    olderRequestRef.current = false;
    restoredConversationRef.current = "";
    setNewMessageCount(0);
  }, [active?.id]);

  useEffect(() => {
    const root = scrollRef.current;
    const target = olderSentinelRef.current;
    if (!root || !target || !messages.hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || messages.isFetchingNextPage) return;
        loadOlder();
      },
      { root, rootMargin: "500px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [
    active?.id,
    messageItems.length,
    messages.hasNextPage,
    messages.isFetchingNextPage,
    messages.fetchNextPage,
  ]);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node || !active?.id || !messages.isSuccess) return;
    if (restoredConversationRef.current !== active.id) {
      restoredConversationRef.current = active.id;
      const saved = readConversationScroll(active.id);
      if (saved == null) {
        node.scrollTop = node.scrollHeight;
        shouldStickRef.current = true;
      } else {
        node.scrollTop = saved;
        shouldStickRef.current = isNearBottom(node);
      }
    } else if (historyHeightRef.current != null) {
      node.scrollTop += node.scrollHeight - historyHeightRef.current;
      historyHeightRef.current = null;
    } else if (shouldStickRef.current) node.scrollTop = node.scrollHeight;
  }, [messageItems.length, active?.id, messages.isSuccess]);

  useEffect(() => {
    if (!messageSearch.currentId) return;
    jumpToMessage(messageSearch.currentId, false);
  }, [messageSearch.currentId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "f" &&
        showMessages
      ) {
        event.preventDefault();
        messageSearch.setOpen(true);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const input = document.querySelector<HTMLInputElement>(
          '[aria-label="جستجوی گفتگوها"]',
        );
        input?.focus();
        return;
      }
      if (event.key === "Escape" && messageSearch.open) {
        event.preventDefault();
        messageSearch.setOpen(false);
        return;
      }
      if (typing || !active) return;
      if (
        event.altKey &&
        (event.key === "ArrowUp" || event.key === "ArrowDown")
      ) {
        event.preventDefault();
        const index = filtered.findIndex((item) => item.id === active.id);
        if (index < 0) return;
        const nextIndex =
          event.key === "ArrowUp"
            ? Math.max(0, index - 1)
            : Math.min(filtered.length - 1, index + 1);
        if (filtered[nextIndex] && filtered[nextIndex].id !== active.id)
          selectConversation(filtered[nextIndex]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active?.id, filtered, messageSearch.open, showMessages]);

  useEffect(
    () => () => {
      if (highlightTimerRef.current)
        window.clearTimeout(highlightTimerRef.current);
      persistConversationScroll(active?.id, scrollRef.current?.scrollTop || 0);
    },
    [active?.id],
  );

  function selectConversation(item: Conversation) {
    persistConversationScroll(active?.id, scrollRef.current?.scrollTop || 0);
    persistDraft(active?.id, text);
    setDrafts((current) =>
      active?.id ? { ...current, [active.id]: text } : current,
    );
    shouldStickRef.current = true;
    setShowMessages(true);
    setConversationId(item.id);
    setSelectedConversation(item);
    setReplyTo(null);
    setEditing(null);
    const nextDraft = readDraft(item.id);
    setText(nextDraft);
    setDrafts((current) => ({ ...current, [item.id]: nextDraft }));
    setNewMessageCount(0);
    selection.select(item.id, item.student?.id);
  }

  function submit() {
    const body = text.trim();
    if (body && active?.id && !send.isPending)
      send.mutate({
        id: active.id,
        body,
        replyToId: replyTo?.id,
        editingId: editing?.id,
      });
  }

  function loadOlder() {
    if (
      !scrollRef.current ||
      !messages.hasNextPage ||
      messages.isFetchingNextPage ||
      olderRequestRef.current
    )
      return;
    olderRequestRef.current = true;
    historyHeightRef.current = scrollRef.current.scrollHeight;
    void messages.fetchNextPage().finally(() => {
      olderRequestRef.current = false;
    });
  }

  function jumpToMessage(id: string, notifyIfMissing = true) {
    const node = document.getElementById(`message-${id}`);
    if (!node) {
      if (notifyIfMissing)
        notify("این پیام هنوز در تاریخچه بارگذاری‌شده نیست.", "info");
      return;
    }
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(id);
    if (highlightTimerRef.current)
      window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(
      () => setHighlightedMessageId(undefined),
      1200,
    );
  }

  function closeMessageSearch() {
    messageSearch.setOpen(false);
    messageSearch.setQuery("");
  }

  return (
    <div className="grid h-[calc(100dvh-132px)] min-h-0 overflow-hidden lg:h-[calc(100dvh-96px)]">
      <section className="grid min-h-0 gap-3 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
        <ConversationSidebar
          visible={!showMessages}
          items={filtered}
          activeId={active?.id}
          search={search}
          filter={conversationFilter}
          sort={conversationSort}
          favoriteIds={favorites}
          drafts={drafts}
          total={totalConversations}
          unread={totalUnread}
          loading={conversations.isLoading}
          error={conversations.isError}
          fetching={conversations.isFetching}
          hasMore={!!conversations.hasNextPage}
          fetchingMore={conversations.isFetchingNextPage}
          onSearch={setSearch}
          onFilter={setConversationFilter}
          onSort={setConversationSort}
          onSelect={selectConversation}
          onToggleFavorite={toggleFavorite}
          onRetry={() => void conversations.refetch()}
          onMore={() => void conversations.fetchNextPage()}
          onGroupCreated={(id) => {
            void conversations.refetch().then(() => {
              setConversationId(id);
              setShowMessages(true);
            });
          }}
        />

        <Card
          className={`
    ${showMessages ? "flex" : "hidden lg:flex"}

    min-h-0
    flex-col
    overflow-hidden

    border-slate-200/90
    p-0

    shadow-[0_12px_35px_rgba(31,49,46,0.08)]

    dark:border-slate-800
  `}
        >
          {active ? (
            <>
              <ChatHeader
                conversation={active}
                group={groupDetail.data}
                groupLoading={groupDetail.isLoading}
                markingRead={markRead.isPending}
                searchOpen={messageSearch.open}
                onBack={() => {
                  persistConversationScroll(
                    active.id,
                    scrollRef.current?.scrollTop || 0,
                  );

                  setShowMessages(false);

                  selection.clear();
                }}
                onMarkRead={() => markRead.mutate(active.id)}
                onToggleSearch={() =>
                  messageSearch.setOpen(!messageSearch.open)
                }
                onGroupChanged={() => void conversations.refetch()}
              />

              {messageSearch.open ? (
                <MessageSearchBar
                  value={messageSearch.query}
                  count={messageSearch.matches.length}
                  index={messageSearch.index}
                  onChange={messageSearch.setQuery}
                  onNext={messageSearch.next}
                  onPrevious={messageSearch.previous}
                  onClose={closeMessageSearch}
                />
              ) : null}

              <div
                ref={scrollRef}
                role="log"
                aria-live="polite"
                aria-label="پیام‌های گفتگو"
                onScroll={(event) => {
                  const node = event.currentTarget;

                  const nearBottom = isNearBottom(node);

                  shouldStickRef.current = nearBottom;

                  if (nearBottom) {
                    setNewMessageCount(0);
                  }

                  /*
            Load history only near top
          */

                  if (node.scrollTop < 120 && !messages.isFetchingNextPage) {
                    const previousHeight = node.scrollHeight;

                    loadOlder();

                    requestAnimationFrame(() => {
                      const newHeight = node.scrollHeight;

                      node.scrollTop += newHeight - previousHeight;
                    });
                  }
                }}
                className="
          chat-canvas

          relative

          min-h-0
          flex-1

          space-y-2

          overflow-auto

          overscroll-contain

          scroll-smooth

          px-2
          py-3

          sm:px-5
          sm:py-4
        "
              >
                {messages.hasNextPage ? (
                  <div
                    ref={olderSentinelRef}
                    className="
                flex
                min-h-10
                justify-center
              "
                  >
                    <Button
                      className="h-8"
                      variant="soft"
                      loading={messages.isFetchingNextPage}
                      onClick={loadOlder}
                    >
                      <ChevronUp size={15} />

                      {messages.isFetchingNextPage
                        ? "در حال دریافت تاریخچه"
                        : "پیام‌های قدیمی‌تر"}
                    </Button>
                  </div>
                ) : (
                  <div
                    ref={olderSentinelRef}
                    className="
                text-center
                text-[10px]
                text-slate-400
              "
                  >
                    ابتدای گفتگو
                  </div>
                )}

                {messages.isLoading ? (
                  <MessageSkeleton />
                ) : messages.isError ? (
                  <EmptyState
                    title="دریافت پیام‌ها ناموفق بود."
                    action={
                      <Button
                        variant="soft"
                        onClick={() => void messages.refetch()}
                      >
                        <WifiOff size={15} />
                        تلاش دوباره
                      </Button>
                    }
                  />
                ) : messageItems.length ? (
                  <MessageList
                    items={messageItems}
                    authUserId={auth.user?.id}
                    isGroup={active.type === "group"}
                    group={groupDetail.data}
                    activeSearchId={messageSearch.currentId}
                    highlightedId={highlightedMessageId}
                    onJumpToMessage={jumpToMessage}
                    setReplyTo={(message) => {
                      setReplyTo(message);

                      setEditing(null);
                    }}
                    setEditing={(message) => {
                      setEditing(message);

                      setReplyTo(null);

                      setText(message.text);
                    }}
                    act={(method, path, body) => {
                      if (
                        method === "delete" &&
                        !path.includes("/reactions/")
                      ) {
                        void modal
                          .confirm({
                            title: "حذف پیام؟",

                            description:
                              "متن پیام برای اعضای گفتگو حذف خواهد شد.",

                            tone: "danger",

                            confirmLabel: "حذف پیام",
                          })
                          .then((ok) => {
                            if (ok) {
                              messageAction.mutate({
                                method,
                                path,
                                body,
                              });
                            }
                          });
                      } else {
                        messageAction.mutate({
                          method,
                          path,
                          body,
                        });
                      }
                    }}
                  />
                ) : (
                  <EmptyState title="هنوز پیامی ثبت نشده است." />
                )}

                {newMessageCount > 0 || !shouldStickRef.current ? (
                  <button
                    type="button"
                    className="
                sticky

                bottom-3

                mx-auto


                flex

                items-center

                gap-2


                rounded-full


                bg-brand


                px-4

                py-2


                text-xs

                font-bold


                text-white


                shadow-xl


                ring-4

                ring-white/60


                transition


                hover:-translate-y-0.5


                dark:ring-black/20
              "
                    onClick={() => {
                      const node = scrollRef.current;

                      if (node) {
                        node.scrollTo({
                          top: node.scrollHeight,

                          behavior: "smooth",
                        });
                      }

                      shouldStickRef.current = true;

                      setNewMessageCount(0);
                    }}
                  >
                    <ArrowDown size={15} />

                    {newMessageCount
                      ? `${toFa(newMessageCount)} پیام جدید`
                      : "رفتن به آخر گفتگو"}
                  </button>
                ) : null}
              </div>

              <MessageComposer
                conversationId={active.id}
                personName={
                  active.type === "group" ? active.title : active.student?.name
                }
                value={text}
                replyTo={replyTo}
                editing={editing}
                busy={send.isPending}
                disabled={
                  active.type === "group" &&
                  groupDetail.data?.myRole === "member" &&
                  !groupDetail.data.permissions.members_can_send_messages
                }
                onChange={(value) => {
                  setText(value);

                  setDrafts((current) => ({
                    ...current,

                    [active.id]: value,
                  }));

                  persistDraft(active.id, value);
                }}
                onSubmit={submit}
                onCancelContext={() => {
                  const wasEditing = !!editing;

                  setReplyTo(null);

                  setEditing(null);

                  if (wasEditing) {
                    setText("");

                    setDrafts((current) => ({
                      ...current,

                      [active.id]: "",
                    }));

                    persistDraft(active.id, "");
                  }
                }}
                onAfterSend={() => {
                  requestAnimationFrame(() => {
                    const node = scrollRef.current;

                    if (node && shouldStickRef.current) {
                      node.scrollTo({
                        top: node.scrollHeight,

                        behavior: "smooth",
                      });
                    }
                  });
                }}
              />
            </>
          ) : (
            <EmptyState title="یک گفتگو را انتخاب کنید." />
          )}
        </Card>
      </section>
    </div>
  );
}

function activity(item: Conversation) {
  return item.lastMessage?.createdAt
    ? new Date(item.lastMessage.createdAt).getTime()
    : 0;
}
function conversationName(item: Conversation) {
  return item.type === "group" ? item.title || "" : item.student?.name || "";
}
function appendRealtimeMessage(
  qc: ReturnType<typeof useQueryClient>,
  conversationId: string,
  message: ChatMessage,
) {
  qc.setQueryData<InfiniteData<MessagePage>>(
    ["chat-messages", conversationId],
    (current) => {
      if (
        !current?.pages.length ||
        current.pages.some((page) =>
          page.messages.some((item) => item.id === message.id),
        )
      )
        return current;
      const pages = [...current.pages];
      pages[0] = { ...pages[0], messages: [...pages[0].messages, message] };
      return { ...current, pages };
    },
  );
}
function replaceRealtimeMessage(
  qc: ReturnType<typeof useQueryClient>,
  conversationId: string,
  message: ChatMessage,
) {
  qc.setQueryData<InfiniteData<MessagePage>>(
    ["chat-messages", conversationId],
    (current) =>
      current
        ? {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              messages: page.messages.map((item) =>
                item.id === message.id ? message : item,
              ),
            })),
          }
        : current,
  );
}
function patchDeletedMessage(
  qc: ReturnType<typeof useQueryClient>,
  conversationId: string,
  id: string,
  deletedAt: string,
) {
  qc.setQueryData<InfiniteData<MessagePage>>(
    ["chat-messages", conversationId],
    (current) =>
      current
        ? {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              messages: page.messages.map((item) =>
                item.id === id ? { ...item, text: "", deletedAt } : item,
              ),
            })),
          }
        : current,
  );
}
function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
