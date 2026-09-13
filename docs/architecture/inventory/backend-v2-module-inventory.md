# Backend v2 module inventory

**Source branch:** `develop`  
**Source commit:** `e6185d391030bb012aad8404bd61b5b91ab964ab`  
**Inventory date:** 2026-09-13  
**Graphify status:** fresh `graphify-out/graph.json` not yet committed; this inventory is source-derived.

## Summary

The backend currently has **32 module directories** under `backend-v2/src/modules/`.

- **28** are registered in `AppModule`.
- **4** are dormant placeholder modules and are not registered: `questions`, `quiz`, `recommendations`, and `reviews`.
- No current module should be treated as a reusable CMB package solely because of its name.
- The safest first extraction candidates are `health` and `realtime`.
- `sync`, `dashboard`, `guardian`, and `onboarding` are product orchestration points and should remain in the Moshaver composition until their responsibilities are deliberately split.

## Classification vocabulary

| Classification | Meaning |
| --- | --- |
| `cmb-foundation` | Low-level runtime/foundation capability that can become part of the reusable CMB base. |
| `cmb-platform` | Generic platform capability suitable for reuse with limited product coupling. |
| `cmb-platform-split` | Conceptually reusable capability whose current implementation contains Moshaver-specific entities/policy and must be split first. |
| `moshaver-product` | Education/business capability owned by the Moshaver product. |
| `moshaver-product-orchestration` | Cross-domain product workflow/read model that intentionally coordinates several product capabilities. |
| `dormant-product-placeholder` | Present in source but not registered in the active backend composition. |

## Extraction readiness rules

A module is ready to move under a future `packages/cmb/*` boundary only when all of the following are true:

1. its public API is explicit;
2. it does not import Moshaver product entities or education-specific policy;
3. persistence ownership is isolated behind a module-owned contract/repository;
4. product-specific roles/resources are supplied through policy extension points rather than hardcoded;
5. migrations are deterministic and owned;
6. tests can run outside the Moshaver API composition root;
7. a non-education reference application can consume it without importing Moshaver product code.

## Registered modules

| Module | Target class | Readiness | Wave | Direct Nest module deps | Main reason |
| --- | --- | --- | --- | --- | --- |
| `health` | `cmb-foundation` | near-ready | W1 | — | Minimal runtime health capability with no product domain ownership. |
| `realtime` | `cmb-platform` | near-ready | W1 | — | Controller/service boundary; no product persistence in module metadata. |
| `users` | `cmb-platform` | near-ready | W2 | — | Identity/session/role-assignment persistence; no education entity in module metadata. |
| `organizations` | `cmb-platform` | near-ready | W2 | — | Generic organization/membership/role tenancy primitives. |
| `system` | `cmb-platform` | decouple-lightly | W2 | — | Versions/releases/audit/user operations; persistence ownership still shared. |
| `auth` | `cmb-platform-split` | requires-decoupling | W3 | — | Generic session auth concept, but current module imports `Student`, role assignments, and organization membership. |
| `authorization` | `cmb-platform-split` | requires-decoupling | W3 | — | Generic capability/policy concept, but currently imports `Student` and Moshaver relationships. |
| `notifications` | `cmb-platform-split` | requires-decoupling | W3 | `realtime` | Reusable delivery/state mechanism, but current persistence directly includes `Student` and `User`. |
| `activity` | `cmb-platform-split` | requires-split | W4 | `authorization` | Generic activity/audit concepts are mixed with `Student`, student presence, and tasks. |
| `import-export` | `cmb-platform-split` | requires-split | W4 | `authorization` | Generic import/export mechanism is mixed with plans, exams, students, questions, and education schema `2.0`. |
| `relationships` | `moshaver-product` | keep-product | — | — | Current relationship model is tied to student/advisor/guardian-style product authority. |
| `subjects` | `moshaver-product` | keep-product | — | — | Education subject, teacher assignment, and student-subject domain. |
| `assessments` | `moshaver-product` | keep-product | — | `authorization` | Exam/quiz/syllabus/retry/student assessment domain. |
| `guardian` | `moshaver-product-orchestration` | keep-product | — | `notifications`, `exams` | Coordinates guardian relationships, plans, study, exams, reports, encouragement, audit, and notifications. |
| `dashboard` | `moshaver-product-orchestration` | keep-product | — | — | Cross-domain role dashboard implemented through raw SQL over many product tables. |
| `learning-resources` | `moshaver-product` | keep-product | — | `authorization` | Student learning-resource assignment domain. |
| `onboarding` | `moshaver-product-orchestration` | keep-product | — | — | Creates students, memberships, advisor relations, role assignments, and conversations. |
| `relaxation` | `moshaver-product` | keep-product | — | — | Student relaxation/tracking product feature. |
| `students` | `moshaver-product` | keep-product | — | — | Core learner domain plus mastery/review/recovery/retry concerns. |
| `plans` | `moshaver-product` | keep-product | — | `authorization` | Student plan/task education workflow. |
| `exams` | `moshaver-product` | keep-product | — | — | Exam/question/attempt/assignment/scoring domain. |
| `sync` | `moshaver-product-orchestration` | keep-product | — | `tasks`, `study-sessions`, `reports`, `students`, `exams` | Product offline/sync orchestrator with the largest explicit module fan-out. |
| `analytics` | `moshaver-product` | keep-product | — | `authorization` | Student/recommendation analytics. |
| `chat` | `moshaver-product` | keep-product | — | `realtime`, `notifications` | Communication domain tied to students, relationships, memberships, and product authorization. |
| `study-sessions` | `moshaver-product` | keep-product | — | — | Student/task study-session domain. |
| `tasks` | `moshaver-product` | keep-product | — | — | Student task/comment/issue domain. |
| `mistakes` | `moshaver-product` | keep-product | — | `authorization` | Student mistake/review domain. |
| `reports` | `moshaver-product` | keep-product | — | `authorization` | Daily report/recovery/student reporting domain. |

## Dormant module directories

| Module | Registered | Classification | Action |
| --- | ---: | --- | --- |
| `questions` | no | `dormant-product-placeholder` | Keep out of extraction planning until it becomes an active product module or is removed. |
| `quiz` | no | `dormant-product-placeholder` | Same. |
| `recommendations` | no | `dormant-product-placeholder` | Same. |
| `reviews` | no | `dormant-product-placeholder` | Same. |

## Non-module backend areas

The reusable CMB kernel is more likely to emerge from current non-domain areas than from an existing `modules/*` directory:

| Current area | Future role | Notes |
| --- | --- | --- |
| `src/main.ts` | application bootstrap/composition | Keep in API app; reusable bootstrap primitives may be extracted later. |
| `src/app.module.ts` | composition root | Must become thinner as packages are extracted. |
| `src/config/` | CMB foundation + app config | Split generic config validation/lifecycle from Moshaver/environment specifics. |
| `src/common/filters/` | CMB HTTP/runtime foundation candidate | Standard error handling can become reusable if transport contracts are stable. |
| `src/common/interceptors/` | CMB observability candidate | Logging/observability should depend on generic request/context contracts. |
| `src/common/guards/` | security platform + product policy split | Session/CSRF can be reusable; role/resource policy must not hardcode Moshaver domain semantics. |
| `src/database/` | infrastructure adapter + current shared persistence catalog | Major coupling hotspot: many modules directly import entities from the shared database folder. |

## Extraction waves

### W1 — prove the package boundary

- `health`
- `realtime`

Goal: prove CMB package/build/test/registration mechanics using low-coupling capabilities.

### W2 — identity and tenancy primitives

- `users`
- `organizations`
- `system`

Goal: establish persistence ownership and reusable identity/organization contracts without pulling education policy into CMB.

### W3 — security and delivery platform

- `auth`
- `authorization`
- `notifications`

Prerequisite: replace direct `Student`/Moshaver relationship dependencies with generic identity/resource/policy contracts.

### W4 — split mixed capabilities

- `activity`
- `import-export`

Extract only the generic mechanism. Moshaver activity projections and education import/export codecs stay product-owned.

## Product modules intentionally left in the API/product layer

The product modules are not technical debt merely because they remain inside Moshaver. Their extraction target, if any, is future `packages/product/*`, not `packages/cmb/*`.

Cross-domain orchestrators such as `sync`, `dashboard`, `guardian`, and `onboarding` should become consumers of stable module public APIs over time rather than owning or querying other modules' private persistence directly.

## Key Phase-1 findings

1. **The shared TypeORM entity catalog is the dominant coupling mechanism.** Module metadata often looks simple while services can still query many unrelated tables.
2. **Nest module imports do not reveal the whole graph.** `dashboard` has no module dependencies but executes raw SQL over many product tables; `onboarding` similarly coordinates multiple domains through `DataSource`.
3. **Authorization is high fan-in but not yet generic.** At least eight active modules import it, while its current persistence model includes `Student`.
4. **Realtime is the cleanest reusable platform proof.** Notifications and chat already consume it through an exported service.
5. **Sync is product orchestration, not platform infrastructure in its current form.** It directly depends on five product modules and many product entities.
6. **The API contract package is not yet a backend dependency.** Admin and student-core consume `@moshaver/api-contract`, while backend-v2 currently owns its HTTP DTOs independently.

## Remaining Phase-1 work

- generate a fresh current-v2 Graphify graph;
- compare file-level graph edges against this source inventory;
- find circular/deep imports outside Nest module metadata;
- add enforceable forbidden-dependency checks after package boundaries exist;
- resolve shared API-contract ownership under CMB issue #27.
