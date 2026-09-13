"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { TENANCY_MODULE, TenancyPolicy } = require("../src");
const policy = new TenancyPolicy(); const platform = { roles: ["PLATFORM_ADMIN"], organizationIds: [] }; const scoped = { roles: ["ORG_ADMIN"], organizationIds: ["org-a", "org-b"] };
test("declares the reusable tenancy module", () => { assert.equal(TENANCY_MODULE.id, "tenancy"); assert.deepEqual(TENANCY_MODULE.dependencies, ["kernel"]); });
test("resolves explicit and default organization scopes", () => { assert.equal(policy.resolveOrganizationScope(platform), undefined); assert.equal(policy.resolveOrganizationScope(scoped), "org-a"); assert.equal(policy.resolveOrganizationScope(scoped, "org-b"), "org-b"); assert.equal(policy.resolveOrganizationScope(scoped, "org-c"), null); });
test("prevents non-platform role escalation", () => { assert.equal(policy.canAssignRoles(scoped, ["ADVISOR"]), true); assert.equal(policy.canAssignRoles(scoped, ["PLATFORM_ADMIN"]), false); assert.equal(policy.canAssignRoles(platform, ["PLATFORM_ADMIN"]), true); });
