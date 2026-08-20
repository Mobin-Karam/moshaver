import type { ApiError } from '../types.js';

export interface NetworkProvider {
  request<TResponse, TBody = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: TBody | null,
    options?: NetworkRequestOptions,
  ): Promise<TResponse>;
}

export interface NetworkRequestOptions {
  suppressAuthFailure?: boolean;
  noCsrfRetry?: boolean;
}

export interface AuthProvider<TUser = unknown> {
  currentUser(): Promise<TUser | null>;
  login(username: string, password: string): Promise<TUser>;
  logout(): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  onAuthFailure?(handler: (error: ApiError) => void): void;
}

export interface StorageProvider {
  save<T>(key: string, value: T): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  list?(prefix: string): Promise<Array<{ key: string; value: unknown }>>;
}

export interface NotificationProvider {
  list(): Promise<unknown[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
  notifyLocal?(title: string, body: string): Promise<void>;
}

export interface SyncProvider {
  enqueue<T>(item: SyncQueueItem<T>): Promise<void>;
  pending(): Promise<SyncQueueItem[]>;
  remove(id: string): Promise<void>;
}

export interface SyncQueueItem<T = unknown> {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body: T;
  createdAt: string;
  conflictPolicy: 'server-wins' | 'student-wins' | 'manual';
}

export interface RealtimeProvider {
  connect(handlers: RealtimeHandlers): void;
  disconnect(): void;
}

export interface RealtimeHandlers {
  onEvent(type: string, data: unknown, lastEventId?: string): void;
  onState?(state: 'open' | 'reconnecting' | 'closed'): void;
}

export interface ClockProvider {
  now(): Date;
  setInterval(handler: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
}
