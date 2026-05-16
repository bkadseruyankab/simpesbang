---
Task ID: 1
Agent: Main Agent
Task: Fix logo upload not working in Identitas Aplikasi settings

Work Log:
- Investigated the full upload flow: frontend (pengaturan-page.tsx) → API route (upload/route.ts) → blob-store.ts → compress.ts → Prisma/SQLite
- Found multiple issues causing the logo upload to fail:
  1. Used `document.getElementById` for file input triggering - fragile in React
  2. Browser caching prevented updated logos from showing (same URL `/api/file/blob/app_logo`)
  3. Settings sync race condition - one-time sync with `settingsLoaded` could miss updates
  4. PNG logos were being converted to JPEG by compression, breaking transparency
  5. MIME type detection failed when browser didn't provide `file.type`
  6. Upload API returned `message` field but frontend expected `error` field for error messages
  7. Cache-busting params in URL would be saved to database on settings save

- Fixes applied:
  1. Replaced `document.getElementById` with `useRef` for logo and favicon file inputs
  2. Added cache-busting timestamp (`?t=`) to blob URLs after upload for immediate visual refresh
  3. Added `logoTimestamp` and `faviconTimestamp` state with `key` prop on `<img>` for re-render
  4. Changed settings sync from one-time (`settingsLoaded`) to `useEffect` with merge logic
  5. Skip compression entirely for logo context (preserves transparency, avoids sharp crashes)
  6. Skip compression for files < 1KB (not worth the overhead)
  7. Fixed PNG compression to keep as PNG instead of converting to JPEG (preserves transparency)
  8. Added MIME type detection from file extension when browser doesn't provide `file.type`
  9. Fixed upload API to return `error` field consistently
  10. Added `onError` handler on `<img>` tags for graceful fallback
  11. Strip cache-busting query params before saving to database
  12. Invalidate sidebar query when settings change so logo updates propagate
  13. Reduced blob file serving cache from 24h to 60s for logo/favicon (blob category)
  14. Added PNG compression format option in compress.ts

Stage Summary:
- All upload tests pass: SVG upload (200), PNG upload (200), file serving (200)
- Logo upload in Identitas Aplikasi is now functional
- Files modified: pengaturan-page.tsx, upload/route.ts, blob-store.ts, compress.ts, file/[category]/[id]/route.ts, app-sidebar.tsx
