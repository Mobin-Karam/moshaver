# Admin v2 release report

Generated: 2026-09-06T10:22:23.938Z

Branch: local checkout

| Gate | Result | Evidence or boundary |
| --- | --- | --- |
| TypeScript | PASS | Completed successfully. |
| Lint | PASS | Completed successfully. |
| Formatting | PASS | Completed successfully. |
| Unit and component tests | PASS | Completed successfully. |
| Accessibility | PASS | Automated axe checks passed; visual contrast still requires a real browser. |
| Coverage | PASS | Scoped critical runtime and business modules met the configured thresholds. |
| Production build | PASS | Completed successfully. |
| API parity | PASS | Completed successfully. |
| Browser test discovery | PASS | Playwright discovered the role-based browser smoke suite. |
| Production dependency audit | PASS | Completed successfully. |
| Live security matrix | WARN | Not rerun: set RUN_SECURITY_E2E=1 with a migrated disposable backend and E2E_API_URL. Static parity, unit tests, and production dependency audit still run. |
| Live browser roles | WARN | Not run: set RUN_BROWSER_E2E=1 and ADMIN_V2_E2E_BASE_URL against a seeded disposable environment. |
| Web Push delivery | WARN | Production-like HTTPS, browser permission, and VAPID delivery require external verification; see docs/operations/admin-v2-web-push-verification.md. |
| Documentation | PASS | Current capability matrix and historical audit banners are present. |
| Bundle size | PASS | Largest JavaScript chunk is 140.02 KiB (react-DrkNm10G.js). |

## Release decision

**READY WITH WARNINGS.** No automated release blocker was found. Warnings require environment-specific verification and are not reported as passes.

Coverage applies to the critical runtime and business-module list in `vitest.config.ts`; it is not a whole-source coverage claim. Generated output and local browser/VAPID boundaries are recorded above.
