export const TENANCY_MODULE: Readonly<{ id: "tenancy"; version: string; kind: "platform"; dependencies: readonly string[] }>;
export interface TenancyActor { roles?: Iterable<string> | null; organizationIds?: Iterable<string> | null }
export class TenancyPolicy {
  constructor(options?: { platformRole?: string });
  isPlatformActor(actor?: TenancyActor | null): boolean;
  canAccessOrganization(actor: TenancyActor | null | undefined, organizationId: unknown): boolean;
  resolveOrganizationScope(actor: TenancyActor | null | undefined, requestedOrganizationId?: unknown): string | null | undefined;
  canAssignRoles(actor: TenancyActor | null | undefined, roles?: Iterable<string> | null): boolean;
}
