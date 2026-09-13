export const AUTHORIZATION_MODULE: Readonly<{ id: "authorization"; version: string; kind: "platform"; dependencies: readonly string[] }>;
export type AuthorizationBase = { id: string; username: string; sessionId: string; role: string };
export type AuthorizationAssignment = { role: string; organizationScoped: boolean; organizationId?: string | null; capabilities: string[] };
export type AuthorizationMembership = { id: string; organizationId: string };
export type AuthorizationContext = AuthorizationBase & { roles: string[]; capabilities: string[]; membershipIds: string[]; organizationIds: string[] };
export function buildAuthorizationContext(base: AuthorizationBase, assignments: AuthorizationAssignment[], memberships: AuthorizationMembership[], options?: { requestedRole?: string; requestedOrganizationId?: string }): AuthorizationContext;
export function hasCapability(context: AuthorizationContext, capability: string): boolean;
export function canAccessOrganization(context: AuthorizationContext, organizationId: string, capability: string): boolean;
