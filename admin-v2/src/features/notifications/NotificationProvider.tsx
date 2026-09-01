import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../shared/api/api";
import { notify } from "../../shared/ui/notifications";
import { useAuth } from "../auth/AuthProvider";
import { notificationAdminUrl, type AdminNotification, type NotificationPage, type PushPreferences, type PushStatus } from "./notification-model";

type NotificationContextValue = {
  items: AdminNotification[]; unread: number; loading: boolean; error: boolean;
  hasMore: boolean; loadingMore: boolean; soundEnabled: boolean; chatSoundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void; setChatSoundEnabled: (value: boolean) => void;
  markRead: (id: string) => void; markAllRead: () => void; loadMore: () => void; refresh: () => void;
  pushStatus: () => Promise<PushStatus>; enablePush: () => Promise<PushStatus>; disablePush: () => Promise<PushStatus>;
  savePushPreferences: (preferences: PushPreferences) => Promise<void>; testPush: () => Promise<void>; testSound: (chat?: boolean) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);
const defaultPreferences: PushPreferences = { lessons: true, messages: true, exams: true, announcements: true };

export function NotificationProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const qc = useQueryClient();
  const [soundEnabled, setSound] = useStoredBoolean("admin-notification-sound", true);
  const [chatSoundEnabled, setChatSound] = useStoredBoolean("admin-chat-sound", true);
  const lastSoundAt = useRef(0);
  const inbox = useInfiniteQuery({
    queryKey: ["notifications"], enabled: auth.status === "authenticated", initialPageParam: "",
    queryFn: ({ pageParam }) => api.get<NotificationPage>(`/notifications?limit=20${pageParam ? `&before=${encodeURIComponent(String(pageParam))}` : ""}`),
    getNextPageParam: (last) => last.hasMore ? last.nextCursor || undefined : undefined,
  });
  const items = useMemo(() => inbox.data?.pages.flatMap((page) => page.items) || [], [inbox.data]);
  const unread = inbox.data?.pages[0]?.unreadCount ?? items.reduce((count, item) => count + (item.isRead ? 0 : 1), 0);
  const read = useMutation({ mutationFn: (id: string) => api.put(`/notifications/${id}/read`, {}), onMutate: async (id) => { await qc.cancelQueries({ queryKey: ["notifications"] }); qc.setQueriesData({ queryKey: ["notifications"] }, (old: typeof inbox.data) => old ? { ...old, pages: old.pages.map((page, index) => ({ ...page, unreadCount: index === 0 ? Math.max(0, Number(page.unreadCount || 0) - (page.items.find((item) => item.id === id && !item.isRead) ? 1 : 0)) : page.unreadCount, items: page.items.map((item) => item.id === id ? { ...item, isRead: true } : item) })) } : old); }, onError: () => { notify("خواندن اعلان ثبت نشد.", "error"); void inbox.refetch(); } });
  const readAll = useMutation({ mutationFn: () => api.put("/notifications/read-all", {}), onMutate: async () => { await qc.cancelQueries({ queryKey: ["notifications"] }); qc.setQueriesData({ queryKey: ["notifications"] }, (old: typeof inbox.data) => old ? { ...old, pages: old.pages.map((page) => ({ ...page, unreadCount: 0, items: page.items.map((item) => ({ ...item, isRead: true })) })) } : old); }, onError: () => { notify("خواندن همه اعلان‌ها ثبت نشد.", "error"); void inbox.refetch(); } });

  function playSound(chat = false) {
    if (chat ? !chatSoundEnabled : !soundEnabled) return;
    const now = Date.now(); if (now - lastSoundAt.current < 500) return; lastSoundAt.current = now;
    try { const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AudioContextClass) return; const context = new AudioContextClass(); const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.type = "sine"; oscillator.frequency.setValueAtTime(chat ? 720 : 560, context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(chat ? 920 : 760, context.currentTime + 0.12); gain.gain.setValueAtTime(0.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22); oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.24); oscillator.onended = () => void context.close(); } catch { /* sound is optional */ }
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    const source = api.openEvents((type, data) => {
      if (type === "notification.created") {
        void qc.invalidateQueries({ queryKey: ["notifications"] });
        const item = data as AdminNotification;
        if (item.type !== "message") playSound(false);
        if (document.hidden && "Notification" in window && Notification.permission === "granted") { const systemNotification = new Notification(item.title || "اعلان مشاور", { body: item.body || "", tag: item.id }); systemNotification.onclick = () => { window.focus(); window.location.assign(notificationAdminUrl(item.url)); systemNotification.close(); }; }
      }
      if (type === "chat.message.created") playSound(true);
    });
    return () => source.close();
  }, [auth.status, soundEnabled, chatSoundEnabled, qc]);

  useEffect(() => { if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js"); }, []);
  useEffect(() => { if (!("serviceWorker" in navigator)) return; const handler = (event: MessageEvent) => { if (event.data?.type === "PUSH_RECEIVED") void inbox.refetch(); if (event.data?.type === "NOTIFICATION_CLICK" && event.data.url) window.location.assign(event.data.url); if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGED" && "Notification" in window && Notification.permission === "granted") void enablePush().catch(() => undefined); }; navigator.serviceWorker.addEventListener("message", handler); return () => navigator.serviceWorker.removeEventListener("message", handler); }, [inbox]);

  async function currentSubscription() { if (!("serviceWorker" in navigator)) return null; return (await navigator.serviceWorker.ready).pushManager.getSubscription(); }
  async function pushStatus(): Promise<PushStatus> { const sub = await currentSubscription(); const remote = await api.get<Omit<PushStatus, "supported" | "permission">>(`/push/status${sub ? `?endpoint=${encodeURIComponent(sub.endpoint)}` : ""}`); return { supported: supportsPush(), permission: supportsPush() ? Notification.permission : "unsupported", registered: !!sub && remote.registered, serverConfigured: remote.serverConfigured, preferences: remote.preferences || defaultPreferences }; }
  async function enablePush() { if (!supportsPush()) throw new Error("این مرورگر اعلان سیستمی را پشتیبانی نمی‌کند."); const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission; if (permission !== "granted") throw new Error(permission === "denied" ? "اجازه اعلان در تنظیمات مرورگر مسدود شده است." : "اجازه اعلان داده نشد."); const config = await api.get<{ supported: boolean; vapidPublicKey: string }>("/push/config"); if (!config.supported || !config.vapidPublicKey) throw new Error("ارسال Push روی سرور تنظیم نشده است."); const registration = await navigator.serviceWorker.ready; let subscription = await registration.pushManager.getSubscription(); if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidBytes(config.vapidPublicKey) }); await api.post("/push/subscriptions", subscription.toJSON()); return pushStatus(); }
  async function disablePush() { const subscription = await currentSubscription(); if (subscription) { await api.delete(`/push/subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`); await subscription.unsubscribe(); } return pushStatus(); }
  async function savePushPreferences(preferences: PushPreferences) { await api.put("/push/preferences", preferences); }
  async function testPush() { await api.post("/push/test", {}); void inbox.refetch(); }
  const value: NotificationContextValue = { items, unread, loading: inbox.isLoading, error: inbox.isError, hasMore: inbox.hasNextPage, loadingMore: inbox.isFetchingNextPage, soundEnabled, chatSoundEnabled, setSoundEnabled: setSound, setChatSoundEnabled: setChatSound, markRead: (id) => read.mutate(id), markAllRead: () => readAll.mutate(), loadMore: () => void inbox.fetchNextPage(), refresh: () => void inbox.refetch(), pushStatus, enablePush, disablePush, savePushPreferences, testPush, testSound: playSound };
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useAdminNotifications() { const value = useContext(NotificationContext); if (!value) throw new Error("useAdminNotifications must be used inside NotificationProvider"); return value; }
function supportsPush() { return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; }
function vapidBytes(value: string) { const padded = `${value}${"=".repeat((4 - value.length % 4) % 4)}`.replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0)); }
function useStoredBoolean(key: string, fallback: boolean) { const [value, setValue] = useState(() => localStorage.getItem(key) === null ? fallback : localStorage.getItem(key) === "1"); useEffect(() => localStorage.setItem(key, value ? "1" : "0"), [key, value]); return [value, setValue] as const; }
