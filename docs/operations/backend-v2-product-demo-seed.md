# Backend v2 product demo seed

This seed creates a deterministic Persian product demo for backend v2, Admin v2, and the Student/Family clients. It is intended for local development, QA, screenshots, and role/tenant walkthroughs only.

## Safety boundary

The commands refuse to run when `NODE_ENV=production`. They also require an explicit opt-in and a `DATABASE_PATH` whose filename contains `demo`, `test`, or `e2e` (or a path inside the operating-system temporary directory). Reset removes only that exact guarded SQLite demo database (plus its SQLite WAL/SHM sidecars) and then recreates all security and product fixtures. It cannot target an ordinary production-named database.

Do not point these commands at production or a database containing valuable data.

## Create or refresh the demo

From `apps/api/`:

```bash
DATABASE_PATH=./data/moshaver-product-demo.sqlite npm run seed:demo
```

The seed runs migrations and upserts the product records. It is independent of the larger security-matrix/E2E seed, so the product database remains limited to the three organizations documented below. Running it again should not duplicate the natural-keyed demo records.

To remove the named demo records and rebuild them:

```bash
DATABASE_PATH=./data/moshaver-product-demo.sqlite npm run seed:reset-demo
```

To intentionally replace the normal local platform database (`apps/api/data/moshaver-v2.sqlite`) with this complete seed, use the separately guarded command:

```bash
npm run seed:reset-platform
```

That command deletes only the exact local platform SQLite file and its WAL/SHM sidecars. It refuses production mode and other non-temporary paths.

To change the shared demo password, set `DEMO_PASSWORD` for both creation and subsequent refreshes. The development-only default is `Moshaver-demo-2026!`.

## Included scenarios

- Exactly three active organizations.
- Thirty accounts spanning platform admin, organization admin, advisor, teacher, mentor, content manager, guardian, student, a multi-role member, a disabled account, and an inactive membership.
- Six students distributed across all three organizations, each with a unique valid national code and canonical grade/type/track selection.
- The supplied 1405-1406 Iran education taxonomy and all 212 supplied textbook records. Admin users with `subjects.read` can inspect the books and download both unchanged source JSON datasets.
- Active, pending, rejected, and revoked user relationships.
- Subjects, assignments, plans, tasks, an active study session, daily reports, learning items, a recovery request, a task issue, and an advisor recommendation.
- Draft, upcoming, completed, active/resumable, retry-request, and tenant-isolated exams with question metadata, assignments, attempts, mistakes, syllabus progress, and a quiz.
- Direct and group conversations, read/unread messages, a reply, a reaction, user/system notifications, and an activity event.

Some product concepts are deliberately represented through supported contracts rather than invented fields. Organization-wide exam coverage uses explicit assignments to multiple students; relationship expiry is not seeded because the current relationship model has no expiry field.

## Useful accounts

All usernames below use the configured shared demo password.

| Scenario | Username |
|---|---|
| Platform admin | `demo.platform` |
| Organization A admin | `demo.orgadmin.a` |
| Organization B admin | `demo.orgadmin.b` |
| Advisor A | `demo.advisor.a` |
| Math teacher A | `demo.teacher.math.a` |
| Guardian for primary student | `demo.guardian.a1` |
| Primary rich student | `demo.student.a1` |
| New/almost-empty student | `demo.student.a2` |
| Weak-performance student | `demo.student.a3` |
| Cross-tenant student | `demo.student.b1` |
| Disabled account | `demo.disabled` |
| Inactive-organization member | `demo.suspended.member` |

Security-matrix `e2e.*` accounts belong to `npm run seed:e2e` and are intentionally not added by this product seed.

## Verification

Use a disposable database for a smoke check:

```bash
DEMO_DB="$(mktemp -d)/moshaver-product-demo.sqlite"
DATABASE_PATH="$DEMO_DB" npm run seed:demo
DATABASE_PATH="$DEMO_DB" npm run seed:demo
DATABASE_PATH="$DEMO_DB" npm run seed:reset-demo
```

Successful first and second runs prove creation and rerunnability; the reset command reports the exact guarded database files it removed before recreating the demo.
