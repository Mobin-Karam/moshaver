export const DATA_TRANSFER_MODULE: Readonly<{ id: "data-transfer"; version: string; kind: "platform"; dependencies: readonly string[] }>;
export const DEFAULT_FORBIDDEN_FIELDS: readonly string[];
export function containsForbiddenFields(payload: unknown, fields?: readonly string[]): boolean;
export function nonNegativeNumber(value: unknown): number;
export function positiveNumber(value: unknown, fallback?: number): number;
export function summarizeCollections(collections: Record<string, unknown[] | number>): Record<string, number>;
