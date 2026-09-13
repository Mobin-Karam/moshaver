export const IDENTITY_MODULE: Readonly<{ id: "identity"; version: string; kind: "platform"; dependencies: readonly string[] }>;
export function normalizeUsername(value: unknown): string;
export function uniqueValues(values?: Iterable<unknown> | null): string[];
export function projectCapabilities(assignments?: Iterable<{ capabilities?: Iterable<unknown> | null } | null | undefined> | null): string[];
