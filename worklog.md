---
Task ID: 1-8
Agent: Main Agent
Task: Implement Bengkel role restrictions, PIMPINAN role, and role-based access control

Work Log:
- Updated auth store (src/store/auth.ts) to include bengkelId and phone in AuthUser interface
- Updated login API (src/app/api/auth/login/route.ts) to return bengkelId and phone
- Updated auth/me API (src/app/api/auth/me/route.ts) to return bengkelId and phone
- Rewrote sidebar (src/components/layout/app-sidebar.tsx) with role-based navigation filtering:
  - BENGKEL: Dashboard, Service, Notifikasi only
  - PIMPINAN: Dashboard, Kendaraan, Service, Anggaran, Riwayat, Laporan, Notifikasi (read-only)
  - ADMIN/SUPER_ADMIN: Full access
- Updated dashboard API (src/app/api/dashboard/route.ts) with role-based filtering:
  - BENGKEL: Only shows vehicles/services/budgets from assigned bengkel
  - PIMPINAN: Shows all data with readOnly flag
- Rewrote dashboard page (src/components/dashboard/dashboard-page.tsx) with role-specific views and banners
- Updated service page (src/components/service/service-page.tsx) for Bengkel role:
  - Auto-filters by bengkelId for BENGKEL role
  - Hides "Tambah Service" for PIMPINAN; controlled by system setting for BENGKEL
  - Role-based action buttons: BENGKEL can only edit/detail/upload nota; PIMPINAN is read-only
  - Added MENUNGGU_PERSETUJUAN status for bengkel completion workflow
  - Added Bengkel edit dialog with progress, notes, nota upload, and "mark as complete" checkbox
- Updated progress API (src/app/api/service/[id]/progress/route.ts):
  - Supports MENUNGGU_PERSETUJUAN status
  - Creates admin notifications when bengkel marks service as complete
- Updated approve API (src/app/api/service/[id]/approve/route.ts):
  - Two approval flows: DIAJUKAN→DISETUJUI and MENUNGGU_PERSETUJUAN→SELESAI
  - Auto-updates budget realisasi on approval
  - Creates bengkel notifications on approval/rejection
- Added bengkel_can_create_service system setting to seed data
- Added PIMPINAN user and second BENGKEL user to seed data
- Added "Bengkel Bisa Tambah Service" toggle to Pengaturan page
- Updated login page to show all demo accounts including PIMPINAN
- Reseeded database with new users and settings

Stage Summary:
- Complete role-based access control implemented for all 4 roles
- Bengkel role restricted to Dashboard, Service (edit/detail/upload nota only), and Notifikasi
- PIMPINAN role has read-only access to Dashboard, Kendaraan, Service, Anggaran, Riwayat, Laporan, Notifikasi
- Bengkel workflow: edit progress → mark as complete → admin approves → SELESAI
- canCreateService toggle in Pengaturan controlled by Admin
- All APIs verified working: login returns bengkelId, dashboard filters by role/bengkelId
- Build passes with 0 errors, lint passes with only 2 pre-existing warnings
