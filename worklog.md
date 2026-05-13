---
Task ID: 1
Agent: Main
Task: Implement complete service workflow for BKAD Vehicle Service System

Work Log:
- Updated Prisma schema: added `canAddService` boolean field to Workshop model
- Added `PENGAJUAN` status to StatusService type
- Updated Workshop interface to include `canAddService`
- Created `/src/lib/notifications.ts` utility with WA/Email integration via z-ai-web-dev-sdk
- Updated `/src/app/api/service/route.ts` - sends notification to bengkel on service creation
- Updated `/src/app/api/service/[id]/approve/route.ts` - handles 3 approval flows (PENGAJUAN, DIAJUKAN, MENUNGGU_PERSETUJUAN)
- Updated `/src/app/api/service/[id]/progress/route.ts` - handles submitPengajuan and progress updates
- Updated `/src/app/api/service/[id]/route.ts` - allows editing DITOLAK services
- Updated `/src/app/api/bengkel/route.ts` and `[id]/route.ts` - supports canAddService field
- Updated `/src/app/api/dashboard/route.ts` - includes PENGAJUAN in stats, added statusCounts
- Rewrote `/src/components/service/service-page.tsx` - full workflow UI with role-based actions
- Updated `/src/components/bengkel/bengkel-page.tsx` - added canAddService toggle
- Updated `/src/components/dashboard/dashboard-page.tsx` - Bengkel dashboard with new workflow stats
- Updated seed data with PENGAJUAN, MENUNGGU_PERSETUJUAN, DITOLAK workflow examples

Stage Summary:
- Complete service workflow implemented:
  1. Admin creates service → DIAJUKAN → Notification to bengkel (WA/Email)
  2. Bengkel edits/adds items → clicks "Kirim Pengajuan" → PENGAJUAN → Notification to admin
  3. Admin approves → DISETUJUI → "Update Progress" appears for bengkel → Notification to bengkel
  4. Admin rejects → DITOLAK → back to bengkel for corrections → Notification to bengkel
  5. Bengkel updates progress → DIPROSES
  6. Bengkel marks complete → MENUNGGU_PERSETUJUAN → Notification to admin
  7. Admin approves → SELESAI → Notification to bengkel
- Bengkel role restrictions: can only Edit/Detail (not Create/Delete by default)
- Admin can toggle canAddService per bengkel to show "Tambah Service" button
- Notification system sends WA/Email via z-ai-web-dev-sdk (best-effort)
- All APIs tested and working
- Lint passes (only pre-existing React Hook Form warnings)
