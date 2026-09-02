import type { StudentNotification } from './student-store';

const SEEN_NOTIFICATION_IDS = 'moshaver_v2_seen_notification_ids';
const isTauri = '__TAURI_INTERNALS__' in window;

type TauriNotificationPlugin = {
  isPermissionGranted: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
  onAction: (handler: (event: unknown) => void) => Promise<() => void>;
  sendNotification: (notification: { title: string; body: string }) => void;
};

async function loadTauriNotificationPlugin(): Promise<TauriNotificationPlugin | null> {
  try {
    const load = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<TauriNotificationPlugin>;
    return await load('@tauri-apps/plugin-notification');
  } catch {
    return null;
  }
}

export type NotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

function readSeenIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_NOTIFICATION_IDS) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function writeSeenIds(ids: Set<string>) {
  localStorage.setItem(SEEN_NOTIFICATION_IDS, JSON.stringify([...ids].slice(-100)));
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (isTauri) {
    const plugin = await loadTauriNotificationPlugin();
    return plugin ? (await plugin.isPermissionGranted()) ? 'granted' : 'default' : 'unsupported';
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (isTauri) {
    const plugin = await loadTauriNotificationPlugin();
    return plugin ? await plugin.requestPermission() : 'unsupported';
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
}

export function registerNotificationClickHandler() {
  if (!isTauri) return;
  void loadTauriNotificationPlugin().then((plugin) => {
    if (plugin) void plugin.onAction(() => window.location.assign('/more'));
  });
}

export async function notifyNewNotifications(notifications: StudentNotification[]) {
  const permission = await getNotificationPermission();
  if (permission !== 'granted') return;

  const seenIds = readSeenIds();
  const fresh = notifications.filter((notification) => !seenIds.has(notification.id));
  notifications.forEach((notification) => seenIds.add(notification.id));
  writeSeenIds(seenIds);
  if (!fresh.length) return;

  if (isTauri) {
    const plugin = await loadTauriNotificationPlugin();
    if (!plugin) return;
    fresh.forEach((notification) => plugin.sendNotification({ title: notification.title, body: notification.message }));
    return;
  }

  fresh.forEach((notification) => {
    const instance = new Notification(notification.title, { body: notification.message, tag: notification.id });
    instance.onclick = () => {
      window.focus();
      window.location.assign('/more');
      instance.close();
    };
  });
}