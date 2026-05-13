'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import {
  Bike, Car, Wrench, CheckCircle2, Wallet, TrendingUp, PiggyBank,
  AlertTriangle, Clock, Bell, ArrowUpRight, ArrowDownRight,
  RefreshCw, Activity, Building2, Eye, FileCheck, FileX
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4']

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

function StatCard({ title, value, icon: Icon, gradient, subtitle, trend }: {
  title: string; value: string | number; icon: React.ElementType
  gradient: string; subtitle?: string; trend?: 'up' | 'down'
}) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-md">
      <div className={`absolute inset-0 ${gradient} opacity-10`} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
                {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-500" />}
                {subtitle}
              </p>
            )}
          </div>
          <div className={`rounded-xl p-2.5 ${gradient} text-white shadow-lg`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const userRole = user?.role || 'ADMIN'
  const bengkelId = user?.bengkelId
  const userId = user?.id

  const [tahun, setTahun] = useState(new Date().getFullYear().toString())
  const [bulan, setBulan] = useState('all')
  const [jenisKendaraan, setJenisKendaraan] = useState('all')

  const isBengkel = userRole === 'BENGKEL'
  const isPimpinan = userRole === 'PIMPINAN'
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard', tahun, bulan, jenisKendaraan, userRole, bengkelId, userId],
    queryFn: async () => {
      const params = new URLSearchParams({ tahun, role: userRole })
      if (bulan !== 'all') params.set('bulan', bulan)
      if (jenisKendaraan !== 'all') params.set('jenisKendaraan', jenisKendaraan)
      if (bengkelId) params.set('bengkelId', bengkelId)
      if (userId) params.set('userId', userId)
      const res = await fetch(`/api/dashboard?${params}`)
      return res.json()
    },
    refetchInterval: 60000,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  const stats = data || {}

  return (
    <div className="space-y-6">
      {/* Role Indicator Banner */}
      {isBengkel && (
        <div className="rounded-xl bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-800 dark:text-amber-300">Mode Bengkel</h2>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Anda hanya dapat melihat data service yang ditugaskan ke bengkel Anda
              </p>
            </div>
          </div>
        </div>
      )}

      {isPimpinan && (
        <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Mode Pimpinan (Read Only)</h2>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Anda dapat melihat semua data dan laporan dalam mode hanya baca
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isBengkel ? 'Dashboard Bengkel' : isPimpinan ? 'Dashboard Pimpinan' : 'Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isBengkel 
              ? 'Ringkasan service kendaraan di bengkel Anda' 
              : isPimpinan
              ? 'Ringkasan keseluruhan service kendaraan operasional dinas'
              : 'Ringkasan data service kendaraan operasional dinas'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={tahun} onValueChange={setTahun}>
            <SelectTrigger className="w-[100px] h-9 text-xs">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
          <Select value={bulan} onValueChange={setBulan}>
            <SelectTrigger className="w-[110px] h-9 text-xs">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
                .map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          {!isBengkel && (
            <Select value={jenisKendaraan} onValueChange={setJenisKendaraan}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue placeholder="Jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="RODA_2">Roda 2</SelectItem>
                <SelectItem value="RODA_4">Roda 4</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" className="h-9" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isBengkel ? (
          <>
            <StatCard
              title="Service Aktif"
              value={stats.kendaraanAktifService || 0}
              icon={Wrench}
              gradient="bg-gradient-to-br from-amber-500 to-orange-600"
              subtitle="Sedang diproses"
            />
            <StatCard
              title="Service Selesai"
              value={stats.kendaraanSelesaiService || 0}
              icon={CheckCircle2}
              gradient="bg-gradient-to-br from-emerald-500 to-green-600"
              subtitle="Perbaikan selesai"
              trend="up"
            />
            <StatCard
              title="Menunggu Persetujuan"
              value={stats.progressPerbaikan?.filter((p: any) => p.statusService === 'DISETUJUI').length || 0}
              icon={FileCheck}
              gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
              subtitle="Siap dikerjakan"
            />
            <StatCard
              title="Ditolak"
              value={0}
              icon={FileX}
              gradient="bg-gradient-to-br from-red-500 to-pink-600"
              subtitle="Perlu revisi"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Kendaraan Roda 2"
              value={stats.totalKendaraanRoda2 || 0}
              icon={Bike}
              gradient="bg-gradient-to-br from-teal-500 to-cyan-600"
              subtitle="Motor / Sepeda"
            />
            <StatCard
              title="Kendaraan Roda 4"
              value={stats.totalKendaraanRoda4 || 0}
              icon={Car}
              gradient="bg-gradient-to-br from-emerald-500 to-green-600"
              subtitle="Mobil / Pick Up"
            />
            <StatCard
              title="Aktif Service"
              value={stats.kendaraanAktifService || 0}
              icon={Wrench}
              gradient="bg-gradient-to-br from-amber-500 to-orange-600"
              subtitle="Sedang diproses"
            />
            <StatCard
              title="Selesai Service"
              value={stats.kendaraanSelesaiService || 0}
              icon={CheckCircle2}
              gradient="bg-gradient-to-br from-purple-500 to-pink-600"
              subtitle="Perbaikan selesai"
              trend="up"
            />
          </>
        )}
      </div>

      {/* Budget Cards - Not shown for BENGKEL */}
      {!isBengkel && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0 shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2.5 bg-gradient-to-br from-slate-700 to-slate-900 text-white">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Anggaran {tahun}</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalAnggaranTahun || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2.5 bg-gradient-to-br from-orange-500 to-red-600 text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Anggaran Terpakai</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalAnggaranTerpakai || 0)}</p>
                </div>
                {(stats.totalAnggaranTahun > 0) && (
                  <Badge variant={((stats.totalAnggaranTerpakai / stats.totalAnggaranTahun) * 100) > 80 ? 'destructive' : 'secondary'} className="text-xs">
                    {Math.round((stats.totalAnggaranTerpakai / stats.totalAnggaranTahun) * 100)}%
                  </Badge>
                )}
              </div>
              {(stats.totalAnggaranTahun > 0) && (
                <Progress value={(stats.totalAnggaranTerpakai / stats.totalAnggaranTahun) * 100} className="mt-3 h-1.5" />
              )}
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2.5 bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
                  <PiggyBank className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sisa Anggaran</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(stats.sisaAnggaran || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts - Only for Admin/SuperAdmin/Pimpinan */}
      {!isBengkel && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Pengeluaran Service Bulanan</CardTitle>
              <CardDescription className="text-xs">12 bulan terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.pengeluaranBulanan || []} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="bulan" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} labelStyle={{ fontSize: 12 }} />
                    <Bar dataKey="total" fill="#0f766e" radius={[4, 4, 0, 0]} name="Pengeluaran" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Kendaraan Paling Sering Service</CardTitle>
              <CardDescription className="text-xs">Top 5 kendaraan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.kendaraanSeringService || []} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="nomorPolisi" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#0d9488" radius={[0, 4, 4, 0]} name="Jumlah Service" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom Section: Notifications + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notifications */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-teal-600" /> Notifikasi Terbaru
              {stats.notifikasiCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{stats.notifikasiCount}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-72 overflow-y-auto">
            {(stats.notifikasiTerbaru?.length > 0) ? stats.notifikasiTerbaru.map((n: any) => (
              <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className={`rounded-full p-1.5 shrink-0 ${
                  n.type === 'ERROR' ? 'bg-red-100 text-red-600' :
                  n.type === 'WARNING' ? 'bg-amber-100 text-amber-600' :
                  n.type === 'SUCCESS' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {n.type === 'ERROR' ? <AlertTriangle className="h-3.5 w-3.5" /> :
                   n.type === 'WARNING' ? <AlertTriangle className="h-3.5 w-3.5" /> :
                   n.type === 'SUCCESS' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                   <Bell className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>
                </div>
              </div>
            )) : (
              <p className="text-xs text-muted-foreground text-center py-4">Tidak ada notifikasi baru</p>
            )}
          </CardContent>
        </Card>

        {/* Alerts Panel */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Alert & Peringatan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-72 overflow-y-auto">
            {/* Over Budget Alerts */}
            {(stats.alertOverBudget?.length > 0) && stats.alertOverBudget.map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                <div className="rounded-full p-1.5 bg-red-100 text-red-600 shrink-0">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400">
                    {a.nomorPolisi} - Anggaran {a.persen}% terpakai
                  </p>
                  <p className="text-[11px] text-red-600/70 dark:text-red-400/70">
                    Terpakai {formatCurrency(a.total)} dari {formatCurrency(a.anggaran)}
                  </p>
                </div>
                <Badge variant="destructive" className="text-[10px] shrink-0">{a.persen}%</Badge>
              </div>
            ))}

            {/* Late Service Alerts */}
            {(stats.alertTerlambat?.length > 0) && stats.alertTerlambat.map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                <div className="rounded-full p-1.5 bg-amber-100 text-amber-600 shrink-0">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    {a.nomorPolisi} - Terlambat {a.hariTerlambat} hari
                  </p>
                  <p className="text-[11px] text-amber-600/70 dark:text-amber-400/70">
                    Estimasi: {a.estimasi}
                  </p>
                </div>
                <Badge className="bg-amber-500 text-white text-[10px] shrink-0">Terlambat</Badge>
              </div>
            ))}

            {(stats.alertOverBudget?.length === 0 && stats.alertTerlambat?.length === 0) && (
              <div className="text-center py-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Tidak ada peringatan saat ini</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress Perbaikan */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-600" /> 
            {isBengkel ? 'Progress Perbaikan di Bengkel Anda' : 'Progress Perbaikan Kendaraan'}
          </CardTitle>
          <CardDescription className="text-xs">
            {isBengkel ? 'Kendaraan yang sedang dalam proses perbaikan di bengkel Anda' : 'Kendaraan yang sedang dalam proses perbaikan'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(stats.progressPerbaikan?.length > 0) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.progressPerbaikan.map((p: any) => (
                <div key={p.id} className="p-4 rounded-xl bg-muted/50 border border-border/50 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-primary">{p.nomorPolisi}</span>
                    <Badge variant={p.statusService === 'DIPROSES' ? 'default' : 'secondary'} className="text-[10px]">
                      {p.statusService}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-1">{p.merk} • {p.bengkel}</p>
                  <p className="text-[11px] text-muted-foreground mb-3">{p.nomorService}</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span>Progress</span>
                      <span className="font-medium">{p.progress}%</span>
                    </div>
                    <Progress value={p.progress} className="h-2" />
                  </div>
                  {p.estimasiLamaPerbaikan && (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Estimasi: {p.estimasiLamaPerbaikan} hari
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Wrench className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {isBengkel ? 'Tidak ada kendaraan dalam proses perbaikan di bengkel Anda' : 'Tidak ada kendaraan dalam proses perbaikan'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bengkel Statistics - Only for Admin */}
      {isAdmin && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Statistik Bengkel</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats.statistikBengkel?.length > 0) ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.statistikBengkel.map((b: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                    <div className="rounded-lg p-2 bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">{b.nama}</p>
                      <p className="text-lg font-bold">{b.total} <span className="text-xs font-normal text-muted-foreground">service</span></p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Tidak ada data bengkel</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
