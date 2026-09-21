# Private organization bootstrap

This seed creates one active private-practice organization, the scoped advisor
`mobinkaram`, the student `mahakaram`, their active advisor relationship, and the
current education catalog. It is idempotent and does not delete existing data.

## Development

From `apps/api`:

```bash
npm run seed:private-org:dev
```

Development uses documented fixture credentials and a structurally valid fake
national code. Override `MOBINKARAM_PASSWORD`, `MAHAKARAM_PASSWORD`,
`MAHAKARAM_NATIONAL_CODE`, or `PRIVATE_ORGANIZATION_NAME` when required.

## Production

Run migrations and take a verified database backup first. Inject all sensitive
values through the PaaS secret manager, then run this as a one-time release job:

```bash
NODE_ENV=production \
ALLOW_PRODUCTION_BOOTSTRAP=true \
MOBINKARAM_PASSWORD='<advisor secret>' \
MAHAKARAM_PASSWORD='<student secret>' \
MAHAKARAM_NATIONAL_CODE='<student national code>' \
npm run seed:private-org:production
```

Production execution is refused unless the explicit opt-in is present, both
passwords are at least 12 characters and different, and the national code passes
Iranian national-code checksum validation. The seed never prints passwords or
the national code. Remove the one-time secrets and disable
`ALLOW_PRODUCTION_BOOTSTRAP` after a successful run.
