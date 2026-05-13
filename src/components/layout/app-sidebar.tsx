'use client'

import { useNavigationStore, type PageKey } from '@/store/navigation'
import {
  LayoutDashboard,
  Car,
  Wrench,
  Wallet,
  Building2,
  Package,
  History,
  FileBarChart,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  Shield,
  Bike,
  Truck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const navItems: { key: PageKey; label: string; icon: React.ReactNode; group: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, group: 'Utama' },
  { key: 'kendaraan', label: 'Kendaraan', icon: <Car className="h-5 w-5" />, group: 'Utama' },
  { key: 'service', label: 'Service', icon: <Wrench className="h-5 w-5" />, group: 'Utama' },
  { key: 'anggaran', label: 'Anggaran', icon: <Wallet className="h-5 w-5" />, group: 'Utama' },
  { key: 'bengkel', label: 'Bengkel', icon: <Building2 className="h-5 w-5" />, group: 'Manajemen' },
  { key: 'suku-cadang', label: 'Suku Cadang', icon: <Package className="h-5 w-5" />, group: 'Manajemen' },
  { key: 'riwayat', label: 'Riwayat', icon: <History className="h-5 w-5" />, group: 'Laporan' },
  { key: 'laporan', label: 'Laporan', icon: <FileBarChart className="h-5 w-5" />, group: 'Laporan' },
  { key: 'notifikasi', label: 'Notifikasi', icon: <Bell className="h-5 w-5" />, group: 'Sistem' },
  { key: 'pengaturan', label: 'Pengaturan', icon: <Settings className="h-5 w-5" />, group: 'Sistem' },
]

export function AppSidebar() {
  const { currentPage, setCurrentPage, sidebarOpen, setSidebarOpen } = useNavigationStore()

  const groups = [...new Set(navItems.map(item => item.group))]

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r border-border/50 bg-sidebar transition-all duration-300 ease-in-out flex flex-col',
          sidebarOpen ? 'w-64' : 'w-[68px]'
        )}
      >
        {/* Logo Section */}
        <div className="flex h-16 items-center gap-3 border-b border-border/50 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 shadow-md">
            <Shield className="h-5 w-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-sidebar-foreground tracking-tight">BKAD</span>
              <span className="text-[10px] text-muted-foreground leading-tight truncate">Service Kendaraan</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-6">
            {groups.map((group) => (
              <div key={group}>
                {sidebarOpen && (
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group}
                  </p>
                )}
                <div className="space-y-1">
                  {navItems
                    .filter(item => item.group === group)
                    .map((item) => {
                      const isActive = currentPage === item.key
                      const button = (
                        <Button
                          key={item.key}
                          variant={isActive ? 'secondary' : 'ghost'}
                          className={cn(
                            'w-full justify-start gap-3 h-10 transition-all duration-200',
                            isActive
                              ? 'bg-primary/10 text-primary font-semibold shadow-sm hover:bg-primary/15'
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                            !sidebarOpen && 'justify-center px-2'
                          )}
                          onClick={() => setCurrentPage(item.key)}
                        >
                          <span className={cn(
                            'shrink-0 transition-colors',
                            isActive ? 'text-primary' : 'text-sidebar-foreground/50'
                          )}>
                            {item.icon}
                          </span>
                          {sidebarOpen && (
                            <span className="truncate text-sm">{item.label}</span>
                          )}
                        </Button>
                      )

                      if (!sidebarOpen) {
                        return (
                          <Tooltip key={item.key}>
                            <TooltipTrigger asChild>
                              {button}
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-medium">
                              {item.label}
                            </TooltipContent>
                          </Tooltip>
                        )
                      }

                      return button
                    })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Collapse Button */}
        <div className="border-t border-border/50 p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
