'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  History, Search, Filter, Car, Bike, Wrench, Calendar,
  ChevronDown, ChevronUp, TrendingUp, BarChart3, PieChart as PieChartIcon,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#f59e0b', '#ef4444', '#8b5cf6']

const statusColors: Record<string, string> = {
  DIAJUKAN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DISETUJUI: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  DITOLAK: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DIPROSES: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  SELESAI: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

export function RiwayatPage() {
  const [search, setSearch] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('all')
  const [bengkelFilter, setBengkelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['riwayat', search, vehicleFilter, bengkelFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (vehicleFilter !== 'all') params.set('vehicleId', vehicleFilter)
      if (bengkelFilter !== 'all') params.set('bengkelId', bengkelFilter)
      if (statusFilter !== 'all') params.set('statusService', statusFilter)
      const res = await fetch(`/api/riwayat?${params}`)
      return res.json()
    },
  })

  // Fetch vehicles and workshops for filter dropdowns
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: async () => {
      const res = await fetch('/api/kendaraan?limit=100')
      return res.json()
    },
  })

  const { data: bengkelData } = useQuery({
    queryKey: ['bengkel-list'],
    queryFn: async () => {
      const res = await fetch('/api/bengkel?limit=50')
      return res.json()
    },
  })

  const services = data?.services || []
  const summary = data?.summary || {}
  const chartData = data?.chartData || []
  const pieData = data?.pieData || []
  const vehicles = vehiclesData?.data || []
  const bengkels = bengkelData?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6" /> Riwayat Perbaikan
          </h1>
          <p className="text-sm text-muted-foreground">Histori service dan perbaikan kendaraan dinas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor polisi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Kendaraan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kendaraan</SelectItem>
            {vehicles.map((v: any) => (
              <SelectItem key={v.id} value={v.id}>{v.nomorPolisi} - {v.merk}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={bengkelFilter} onValueChange={setBengkelFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Bengkel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bengkel</SelectItem>
            {bengkels.map((b: any) => (
              <SelectItem key={b.id} value={b.id}>{b.namaBengkel}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="DIAJUKAN">Diajukan</SelectItem>
            <SelectItem value="DISETUJUI">Disetujui</SelectItem>
            <SelectItem value="DIPROSES">Diproses</SelectItem>
            <SelectItem value="SELESAI">Selesai</SelectItem>
            <SelectItem value="DITOLAK">Ditolak</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Biaya Service</p>
              <p className="text-lg font-bold">{formatCurrency(summary.totalBiaya || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-gradient-to-br from-emerald-500 to-green-600 text-white">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Jumlah Service</p>
              <p className="text-lg font-bold">{summary.serviceCount || 0} <span className="text-xs font-normal text-muted-foreground">kali</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rata-rata Biaya</p>
              <p className="text-lg font-bold">{formatCurrency(summary.avgCost || 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Biaya Service Bulanan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="total" fill="#0f766e" radius={[4, 4, 0, 0]} name="Biaya" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" /> Distribusi Item Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Common Items */}
      {summary.commonItems?.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Item Service Paling Sering</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.commonItems.map((item: any, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs gap-1">
                  {item.name} <span className="text-muted-foreground">({item.count}x)</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Timeline */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Timeline Service
          </CardTitle>
          <CardDescription className="text-xs">Klik untuk melihat detail item service</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Tidak ada riwayat service</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {services.map((s: any) => (
                <div key={s.id} className="border border-border/50 rounded-lg overflow-hidden">
                  <div
                    className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  >
                    {/* Timeline dot */}
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      s.statusService === 'SELESAI' ? 'bg-purple-500' :
                      s.statusService === 'DIPROSES' ? 'bg-amber-500' :
                      s.statusService === 'DISETUJUI' ? 'bg-emerald-500' :
                      s.statusService === 'DITOLAK' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium">{s.nomorService}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.vehicle?.nomorPolisi} • {s.vehicle?.merk}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(s.tanggalService).toLocaleDateString('id-ID')}
                        <ArrowRight className="h-3 w-3" />
                        {s.bengkel?.namaBengkel}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold">{formatCurrency(s.totalBiaya)}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[s.statusService] || ''}`}>
                        {s.statusService}
                      </span>
                      {expandedId === s.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expandedId === s.id && (
                    <div className="border-t bg-muted/20 p-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                        <div><span className="text-muted-foreground">Jenis</span><p className="font-medium">{s.jenisService}</p></div>
                        <div><span className="text-muted-foreground">Prioritas</span><p className="font-medium">{s.prioritas}</p></div>
                        <div><span className="text-muted-foreground">Kilometer</span><p className="font-medium">{s.kilometerService?.toLocaleString()} km</p></div>
                        <div><span className="text-muted-foreground">Progress</span><p className="font-medium">{s.progress}%</p></div>
                      </div>
                      {s.keterangan && (
                        <p className="text-xs text-muted-foreground mb-3">Keterangan: {s.keterangan}</p>
                      )}
                      {s.items?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-2">Item Service:</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-[11px]">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-1.5 font-medium">Item</th>
                                  <th className="text-right p-1.5 font-medium">Qty</th>
                                  <th className="text-right p-1.5 font-medium">Harga</th>
                                  <th className="text-right p-1.5 font-medium">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {s.items.map((item: any) => (
                                  <tr key={item.id} className="border-b border-border/30">
                                    <td className="p-1.5">{item.itemName}</td>
                                    <td className="p-1.5 text-right">{item.quantity}</td>
                                    <td className="p-1.5 text-right">{formatCurrency(item.hargaSatuan)}</td>
                                    <td className="p-1.5 text-right font-medium">{formatCurrency(item.totalHarga)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
