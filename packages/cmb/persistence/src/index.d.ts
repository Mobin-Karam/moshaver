export const PERSISTENCE_MODULE: Readonly<{ id: "persistence"; version: string; kind: "foundation"; dependencies: readonly string[] }>;
export const MIGRATION_ID: RegExp;
export type CmbMigration<TContext = unknown> = Readonly<{ id: string; moduleId: string; dependsOn: readonly string[]; up(context: TContext): void | Promise<void>; down(context: TContext): void | Promise<void> }>;
export function defineMigration<TContext = unknown>(input: { id: string; moduleId: string; dependsOn?: string[]; up(context: TContext): void | Promise<void>; down(context: TContext): void | Promise<void> }): CmbMigration<TContext>;
export class CmbMigrationRegistry<TContext = unknown> { constructor(migrations?: Iterable<CmbMigration<TContext>>); register(migration: CmbMigration<TContext>): this; ordered(moduleIds?: Iterable<string>): readonly CmbMigration<TContext>[]; }
export class UnitOfWork<TContext = unknown> { constructor(transaction: <T>(work: (context: TContext) => T | Promise<T>) => T | Promise<T>); run<T>(work: (context: TContext) => T | Promise<T>): T | Promise<T>; }
