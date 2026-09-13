import type { CmbModuleDescriptor } from "@moshaver/cmb-kernel";

export const REALTIME_MODULE: CmbModuleDescriptor;

export type RealtimeEvent<TType extends string = string, TData = unknown> = Readonly<{
  type: TType;
  data: TData;
}>;

export type RealtimeListener<TType extends string = string, TData = unknown> = (event: RealtimeEvent<TType, TData>) => void;

export class InMemoryRealtimeHub<TType extends string = string> {
  subscribe<TData = unknown>(userId: string, listener: RealtimeListener<TType, TData>): () => void;
  emitToUser<TData = unknown>(userId: string, type: TType, data: TData): number;
  emitToUsers<TData = unknown>(userIds: Iterable<string>, type: TType, data: TData): number;
  connectionCount(userId?: string): number;
}
