"use strict";
const { defineModule } = require("@moshaver/cmb-kernel");
const TENANCY_MODULE = defineModule({ id: "tenancy", version: "0.1.0", kind: "platform", dependencies: ["kernel"] });
class TenancyPolicy {
  constructor(options = {}) { this.platformRole = String(options.platformRole ?? "PLATFORM_ADMIN"); }
  isPlatformActor(actor) { return Array.from(actor?.roles ?? []).includes(this.platformRole); }
  canAccessOrganization(actor, organizationId) { const id = String(organizationId ?? "").trim(); return Boolean(id) && (this.isPlatformActor(actor) || Array.from(actor?.organizationIds ?? []).includes(id)); }
  resolveOrganizationScope(actor, requestedOrganizationId) { const requested = String(requestedOrganizationId ?? "").trim(); if (requested) return this.canAccessOrganization(actor, requested) ? requested : null; if (this.isPlatformActor(actor)) return undefined; return Array.from(actor?.organizationIds ?? [])[0] ?? null; }
  canAssignRoles(actor, roles) { return this.isPlatformActor(actor) || !Array.from(roles ?? []).includes(this.platformRole); }
}
module.exports = { TENANCY_MODULE, TenancyPolicy };
