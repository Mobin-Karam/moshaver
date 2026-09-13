export const ACTIVITY_MODULE: Readonly<{ id: "activity"; version: string; kind: "platform"; dependencies: readonly string[] }>;
export const DEFAULT_PRESENCE_STATES: readonly string[];
export function normalizePresenceState(value: unknown, allowedStates?: readonly string[], fallback?: string): string;
export function shouldPersistPresence(previous: { state: string; resourceId?: string | null; lastSeenAt: Date } | null | undefined, next: { state: string; resourceId?: string | null }, now?: Date, debounceMs?: number): boolean;
export function projectPresence(row: { state: string; lastSeenAt: Date; resource?: { id: string; title: string } | null }, now?: Date, onlineWindowMs?: number): { online: boolean; state: string; lastSeenAt: Date; currentTask: { id: string; title: string } | null };
export function clampActivityLimit(value: unknown, fallback?: number, maximum?: number): number;
