# Admin v2 bundle performance report

Date: 2026-09-06

## Result

All feature pages are now loaded at route boundaries. Shared framework dependencies have stable React, Router, Query, UI, and vendor chunks.

| Metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| Monolithic application chunk | 848.73 kB | 136.51 kB | 83.9% smaller |
| Monolithic application gzip | 239.56 kB | 39.32 kB | 83.6% smaller |
| Total eager JavaScript gzip | 239.56 kB | about 181.18 kB | 24.4% smaller |
| Largest emitted JavaScript chunk | 848.73 kB | 143.38 kB | 83.1% smaller |
| Vite large-chunk warning | Present | Absent | Resolved |

The eager total includes the entry module plus module-preloaded React, Router, Query, UI, and general vendor chunks. Feature chunks are fetched only when their routes are visited.

## Verification

`npm run build` completed successfully. The existing PostCSS plugin `from` warning remains unrelated to JavaScript chunking.
