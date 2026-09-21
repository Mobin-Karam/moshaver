export const INFRASTRUCTURE_MODULE: Readonly<{ id: "infrastructure"; version: string; kind: "adapter"; dependencies: readonly string[] }>;
export type CmbAdapter = { port: string; id: string; required?: boolean; ready?(): void | Promise<void>; [key: string]: unknown };
export class CmbAdapterRegistry { constructor(adapters?: Iterable<CmbAdapter>); register(adapter: CmbAdapter): this; resolve<T extends CmbAdapter = CmbAdapter>(port: string): T; inventory(): readonly Readonly<{ port: string; id: string; required: boolean }>[]; readinessProbes(): Array<{ name: string; check(): Promise<void> }>; }
export class InMemoryKeyValueCache { get<T>(key: string): Promise<T | undefined>; set<T>(key: string, value: T): Promise<void>; delete(key: string): Promise<boolean>; ready(): Promise<void>; }
export class InlineJobQueue { enqueue<T>(job: { run(): T | Promise<T> }): Promise<T>; ready(): Promise<void>; }
export class InMemoryObjectStorage { put(key: string, value: unknown): Promise<string>; get<T>(key: string): Promise<T | null>; ready(): Promise<void>; }
export class InMemoryEventBus { subscribe(type: string, listener: (event: { type: string; data?: unknown }) => void | Promise<void>): () => boolean; publish(event: { type: string; data?: unknown }): Promise<void>; ready(): Promise<void>; }
export class NoopDeliveryProvider { constructor(id?: string); id: string; deliver(value?: unknown): Promise<void>; ready(): Promise<void>; }
export class SystemClock { now(): Date; }
export class RandomIdGenerator { next(): string; }
