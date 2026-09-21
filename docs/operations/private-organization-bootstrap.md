# Private organization bootstrap

This seed creates one active private-practice organization with an active member
for every supported platform role. It keeps the requested advisor `mobinkaram`
and student `mahakaram`, creates the advisor, guardian, teacher, and mentor
relationships to that student, and loads the current education catalog. It is
idempotent and does not delete existing data.

| Username              | Role               | Assignment scope                         |
| --------------------- | ------------------ | ---------------------------------------- |
| `mobinkaram.platform` | Platform admin     | Global role plus organization membership |
| `mobinkaram.orgadmin` | Organization admin | Organization                             |
| `mobinkaram`          | Advisor            | Organization                             |
| `mobinkaram.teacher`  | Teacher            | Organization                             |
| `mobinkaram.mentor`   | Mentor             | Organization                             |
| `mobinkaram.content`  | Content manager    | Organization                             |
| `mahakaram.guardian`  | Guardian           | Organization                             |
| `mahakaram`           | Student            | Organization                             |

## Development

From `apps/api`:

```bash
npm run seed:private-org:dev
```

Development uses documented fixture credentials and a structurally valid fake
national code. Any account password, `MAHAKARAM_NATIONAL_CODE`, or
`PRIVATE_ORGANIZATION_NAME` can be overridden through the variables listed in
`apps/api/.env.example`.

## Production

Run migrations and take a verified database backup first. Inject all sensitive
values through the PaaS secret manager, then run this as a one-time release job:

```bash
NODE_ENV=production \
ALLOW_PRODUCTION_BOOTSTRAP=true \
PRIVATE_ORG_PLATFORM_ADMIN_PASSWORD='<platform admin secret>' \
PRIVATE_ORG_ORGANIZATION_ADMIN_PASSWORD='<organization admin secret>' \
MOBINKARAM_PASSWORD='<advisor secret>' \
PRIVATE_ORG_TEACHER_PASSWORD='<teacher secret>' \
PRIVATE_ORG_MENTOR_PASSWORD='<mentor secret>' \
PRIVATE_ORG_CONTENT_MANAGER_PASSWORD='<content manager secret>' \
PRIVATE_ORG_GUARDIAN_PASSWORD='<guardian secret>' \
MAHAKARAM_PASSWORD='<student secret>' \
MAHAKARAM_NATIONAL_CODE='<student national code>' \
npm run seed:private-org:production
```

Production execution is refused unless the explicit opt-in is present, all
eight passwords are at least 12 characters and mutually distinct, and the
national code passes Iranian national-code checksum validation. The seed never
prints passwords or the national code. Remove the one-time secrets and disable
`ALLOW_PRODUCTION_BOOTSTRAP` after a successful run.
