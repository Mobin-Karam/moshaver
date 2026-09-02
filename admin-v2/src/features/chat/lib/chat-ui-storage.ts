const FAVORITES_KEY = "admin-chat-favorites";
const QUICK_REPLIES_KEY = "admin-chat-quick-replies";
const SCROLL_PREFIX = "admin-chat-scroll:";

export const fallbackQuickReplies = [
  "برنامه امروزت را انجام دادی؟",
  "اگر بخشی سخت بود، بگو تا اصلاحش کنم.",
  "نتیجه آزمون را برایم بفرست.",
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage can be unavailable */ }
}

export function readFavoriteConversationIds() {
  return new Set(readJson<string[]>(FAVORITES_KEY, []));
}

export function writeFavoriteConversationIds(ids: Set<string>) {
  writeJson(FAVORITES_KEY, [...ids]);
}

export function readQuickReplies() {
  const items = readJson<string[]>(QUICK_REPLIES_KEY, fallbackQuickReplies);
  return items.length ? items : fallbackQuickReplies;
}

export function writeQuickReplies(items: string[]) {
  writeJson(QUICK_REPLIES_KEY, items);
}

export function readConversationScroll(id: string) {
  try {
    const value = sessionStorage.getItem(`${SCROLL_PREFIX}${id}`);
    const parsed = value == null ? NaN : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function persistConversationScroll(id: string | undefined, scrollTop: number) {
  if (!id) return;
  try { sessionStorage.setItem(`${SCROLL_PREFIX}${id}`, String(Math.max(0, Math.round(scrollTop)))); } catch { /* ignore */ }
}
