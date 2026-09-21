export const NOTIFICATIONS_MODULE: Readonly<{ id: "notifications"; version: string; kind: "platform"; dependencies: readonly string[] }>;
export class InvalidCursorError extends Error {}
export function normalizePageLimit(value: unknown, fallback?: number, maximum?: number): number;
export function encodeCursor(value: { createdAt: Date | string; id: string }): string;
export function decodeCursor(value: string): { createdAt: string; id: string };
export function projectNotification<T>(notification: T & { id: string; type: unknown; category: string; title: string; body: string; url?: string | null; data?: unknown; priority: string; readAt?: Date | null; createdAt: Date; expiresAt?: Date | null }): { id: string; type: unknown; category: string; title: string; body: string; message: string; url: string | null; data: unknown; priority: string; isRead: boolean; readAt: Date | null; createdAt: Date; expiresAt: Date | null };
export interface NotificationRepository<T> { save(notification: T): Promise<T>; list(recipientId?: string): Promise<T[]>; }
export interface NotificationProvider<T> { id: string; deliver(notification: T): Promise<void>; }
export class InMemoryNotificationRepository<T extends { recipientId?: string }> implements NotificationRepository<T> { save(notification: T): Promise<T>; list(recipientId?: string): Promise<T[]>; }
export class NotificationService<TInput extends object, TNotification extends TInput & { id: string; createdAt: Date; readAt: null }> {
  constructor(options: { repository: NotificationRepository<TNotification>; providers?: NotificationProvider<TNotification>[]; events?: { publish(event: { type: string; data: TNotification }): Promise<void> }; clock?: () => Date; id?: () => string });
  create(input: TInput & { createdAt?: Date }): Promise<{ notification: TNotification; deliveries: Array<{ provider: string; status: "delivered" | "failed"; error?: string }> }>;
}
