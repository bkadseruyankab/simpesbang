'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useAuthStore } from '@/store/auth'
import { useNavigationStore } from '@/store/navigation'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { cn } from '@/lib/utils'
import { Shield, Loader2 } from 'lucide-react'

// Lazy load page components with loading states
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    </div>
  )
}

const LoginPage = dynamic(() => import('@/components/auth/login-page').then(m => ({ default: m.LoginPage })), {
  loading: () => <PageLoader />,
  ssr: false
})
const DashboardPage = dynamic(() => import('@/components/dashboard/dashboard-page').then(m => ({ default: m.DashboardPage })), {
  loading: () => <PageLoader />,
  ssr: false
})
const KendaraanPage = dynamic(() => import('@/components/kendaraan/kendaraan-page').then(m => ({ default: m.KendaraanPage })), {
  loading: () => <PageLoader />,
  ssr: false
})
const ServicePage = dynamic(() => import('@/components/service/service-page').then(m => ({ default: m.ServicePage })), {
  loading: () => <PageLoader />,
  ssr: false
})
const AnggaranPage = dynamic(() => import('@/components/anggaran/anggaran-page').then(m => ({ default: m.AnggaranPage })), {
  loading: () => <PageLoader />,
  ssr: false
})
const BengkelPage = dynamic(() => import('@/components/bengkel/bengkel-page').then(m => ({ default: m.BengkelPage })), {
  loading: () => <PageLoader />,
  ssr: false
})
const SukuCadangPage = dynamic(() => import('@/components/suku-cadang/suku-cadang-page').then(m => ({ default: m.SukuCadangPage })), {
  loading: () => <PageLoader />,
  ssr: false
})
const RiwayatPage = dynamic(() => import('@/components/riwayat/riwayat-page').then(m => ({ default: m.RiwayatPage })), {
  loading: () => <PageLoader />,
  ssr: false
})
const LaporanPage = dynamic(() => import('@/components/laporan/laporan-page').then(m => ({ default: m.LaporanPage })), {
  loading: () => <PageLoader />,
  ssr: false
})
const NotifikasiPage = dynamic(() => import('@/components/shared/notifikasi-page').then(m => ({ default: m.NotifikasiPage })), {
  loading: () => <PageLoader />,
  ssr: false
})
const PengaturanPage = dynamic(() => import('@/components/pengaturan/pengaturan-page').then(m => ({ default: m.PengaturanPage })), {
  loading: () => <PageLoader />,
  ssr: false
})

function PageRenderer() {
  const currentPage = useNavigationStore((s) => s.currentPage)

  switch (currentPage) {
    case 'dashboard': return <DashboardPage />
    case 'kendaraan': return <KendaraanPage />
    case 'service': return <ServicePage />
    case 'anggaran': return <AnggaranPage />
    case 'bengkel': return <BengkelPage />
    case 'suku-cadang': return <SukuCadangPage />
    case 'riwayat': return <RiwayatPage />
    case 'laporan': return <LaporanPage />
    case 'notifikasi': return <NotifikasiPage />
    case 'pengaturan': return <PengaturanPage />
    default: return <DashboardPage />
  }
}

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg">
          <Shield className="h-8 w-8 text-white animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Memeriksa autentikasi...</span>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const sidebarOpen = useNavigationStore((s) => s.sidebarOpen)
  const [initialCheck, setInitialCheck] = useState(false)

  useEffect(() => {
    checkAuth().finally(() => setInitialCheck(true))
  }, [checkAuth])

  // Show loading screen during initial auth check
  if (!initialCheck || isLoading) {
    return <AuthLoadingScreen />
  }

  // Not authenticated — show login page
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Authenticated — show main app
  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <div className={cn(
        'flex-1 flex flex-col transition-all duration-300',
        sidebarOpen ? 'ml-64' : 'ml-[68px]'
      )}>
        <AppHeader />
        <main className="flex-1 p-6">
          <PageRenderer />
        </main>
        <footer className="border-t border-border/50 py-3 px-6 text-center text-xs text-muted-foreground">
          © 2025 BKAD - Sistem Informasi Service Kendaraan Operasional Dinas
        </footer>
      </div>
    </div>
  )
}
