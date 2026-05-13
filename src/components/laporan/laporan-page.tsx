'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FileBarChart, Download, Printer, Filter, Calendar, DollarSign, Wrench, Car, CheckCircle, XCircle, Clock, AlertTriangle, BarChart3, PieChart as PieChartIcon } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { toast } from 'sonner'

const STATUS_COLORS: Record<string, string> = {
  DIAJUKAN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DISETUJUI: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  DITOLAK: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  DIPROSES: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  PENDING: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  SELESAI: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6']

const months = [
  { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' }, { value: '4', label: 'April' },
  { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' }, { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
]

export function LaporanPage() {
  const [reportType, setReportType] = useState('tahunan')
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString())
  const [triwulan, setTriwulan] = useState('1')
  const [semester, setSemester] = useState('1')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('all')
  const [filterBengkel, setFilterBengkel] = useState('all')
  const [filterJenisKendaraan, setFilterJenisKendaraan] = useState('all')
  const [filterStatusService, setFilterStatusService] = useState('all')
  const [filterJenisService, setFilterJenisService] = useState('all')
  const [activeTab, setActiveTab] = useState('preview')

  // Fetch vehicles and workshops for filters
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-laporan'],
    queryFn: async () => { const res = await fetch('/api/kendaraan'); return res.json() },
  })
  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops-laporan'],
    queryFn: async () => { const res = await fetch('/api/bengkel'); return res.json() },
  })

  // Fetch report data
  const { data, isLoading } = useQuery({
    queryKey: ['laporan', reportType, year, month, triwulan, semester, dateFrom, dateTo, filterVehicle, filterBengkel, filterJenisKendaraan, filterStatusService, filterJenisService],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('type', reportType)
      params.set('year', year)
      if (reportType === 'bulanan') params.set('month', month)
      if (reportType === 'triwulan') params.set('triwulan', triwulan)
      if (reportType === 'semester') params.set('semester', semester)
      if (reportType === 'custom') {
        if (dateFrom) params.set('dateFrom', dateFrom)
        if (dateTo) params.set('dateTo', dateTo)
      }
      if (filterVehicle !== 'all') params.set('vehicleId', filterVehicle)
      if (filterBengkel !== 'all') params.set('bengkelId', filterBengkel)
      if (filterJenisKendaraan !== 'all') params.set('jenisKendaraan', filterJenisKendaraan)
      if (filterStatusService !== 'all') params.set('statusService', filterStatusService)
      if (filterJenisService !== 'all') params.set('jenisService', filterJenisService)
      const res = await fetch(`/api/laporan?${params}`)
      return res.json()
    },
  })

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  // Pie chart data for status distribution
  const statusPieData = useMemo(() => {
    if (!data?.statistics?.statusDistribution) return []
    return Object.entries(data.statistics.statusDistribution).map(([name, value]) => ({ name, value: value as number }))
  }, [data])

  // Monthly chart data
  const monthlyChartData = useMemo(() => {
    if (!data?.statistics?.monthlyBreakdown) return []
    return data.statistics.monthlyBreakdown.map((m: any) => ({
      ...m,
      monthLabel: new Date(m.month + '-01').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
    }))
  }, [data])

  const handleExport = async (format: string) => {
    try {
      toast.loading(`Mengunduh laporan ${format.toUpperCase()}...`, { id: 'export' })
      const res = await fetch('/api/laporan/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          filters: {
            type: reportType, year, month, triwulan, semester, dateFrom, dateTo,
            vehicleId: filterVehicle !== 'all' ? filterVehicle : undefined,
            bengkelId: filterBengkel !== 'all' ? filterBengkel : undefined,
            jenisKendaraan: filterJenisKendaraan !== 'all' ? filterJenisKendaraan : undefined,
            statusService: filterStatusService !== 'all' ? filterStatusService : undefined,
            jenisService: filterJenisService !== 'all' ? filterJenisService : undefined,
          },
        }),
      })
      
      if (!res.ok) throw new Error('Export failed')
      
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const contentDisp = res.headers.get('Content-Disposition')
      a.download = contentDisp ? contentDisp.split('filename=')[1]?.replace(/"/g, '') : `laporan-service.${format === 'excel' ? 'csv' : 'html'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Laporan ${format.toUpperCase()} berhasil diunduh`, { id: 'export' })
    } catch (error) {
      toast.error('Gagal mengunduh laporan', { id: 'export' })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  const stats = data?.statistics

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-primary" />
            Laporan Service Kendaraan
          </h1>
          <p className="text-muted-foreground">Buat dan ekspor laporan service kendaraan</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Cetak
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button size="sm" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" /> Konfigurasi Laporan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-medium mb-1 block">Jenis Laporan</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tahunan">Tahunan</SelectItem>
                  <SelectItem value="bulanan">Bulanan</SelectItem>
                  <SelectItem value="triwulan">Triwulan</SelectItem>
                  <SelectItem value="semester">Semester</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Tahun</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reportType === 'bulanan' && (
              <div>
                <label className="text-xs font-medium mb-1 block">Bulan</label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {reportType === 'triwulan' && (
              <div>
                <label className="text-xs font-medium mb-1 block">Triwulan</label>
                <Select value={triwulan} onValueChange={setTriwulan}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Triwulan I (Jan-Mar)</SelectItem>
                    <SelectItem value="2">Triwulan II (Apr-Jun)</SelectItem>
                    <SelectItem value="3">Triwulan III (Jul-Sep)</SelectItem>
                    <SelectItem value="4">Triwulan IV (Okt-Des)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {reportType === 'semester' && (
              <div>
                <label className="text-xs font-medium mb-1 block">Semester</label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester I (Jan-Jun)</SelectItem>
                    <SelectItem value="2">Semester II (Jul-Des)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {reportType === 'custom' && (
              <>
                <div>
                  <label className="text-xs font-medium mb-1 block">Dari Tanggal</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Sampai Tanggal</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-medium mb-1 block">Jenis Kendaraan</label>
              <Select value={filterJenisKendaraan} onValueChange={setFilterJenisKendaraan}>
                <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="RODA_2">Roda 2</SelectItem>
                  <SelectItem value="RODA_4">Roda 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Jenis Service</label>
              <Select value={filterJenisService} onValueChange={setFilterJenisService}>
                <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="RUTIN">Rutin</SelectItem>
                  <SelectItem value="PERBAIKAN">Perbaikan</SelectItem>
                  <SelectItem value="DARURAT">Darurat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Status Service</label>
              <Select value={filterStatusService} onValueChange={setFilterStatusService}>
                <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="DIAJUKAN">Diajukan</SelectItem>
                  <SelectItem value="DISETUJUI">Disetujui</SelectItem>
                  <SelectItem value="DIPROSES">Diproses</SelectItem>
                  <SelectItem value="SELESAI">Selesai</SelectItem>
                  <SelectItem value="DITOLAK">Ditolak</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Bengkel</label>
              <Select value={filterBengkel} onValueChange={setFilterBengkel}>
                <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bengkel</SelectItem>
                  {workshops.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>{w.namaBengkel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Total Biaya</p>
                <p className="text-sm font-bold">{formatRupiah(stats?.totalBiaya || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Total Service</p>
                <p className="text-sm font-bold">{stats?.serviceCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Selesai</p>
                <p className="text-sm font-bold">{stats?.completedCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Dalam Proses</p>
                <p className="text-sm font-bold">{stats?.inProgressCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Ditolak</p>
                <p className="text-sm font-bold">{stats?.rejectedCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Anggaran Tahun {year}</p>
              <p className="text-xs text-muted-foreground">Total: {formatRupiah(stats?.totalAnggaran || 0)} | Realisasi: {formatRupiah(stats?.totalRealisasi || 0)}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-32 bg-muted rounded-full h-2">
                <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${Math.min(stats?.persentaseRealisasi || 0, 100)}%` }} />
              </div>
              <span className="text-xs font-medium">{(stats?.persentaseRealisasi || 0).toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="preview">Tabel Data</TabsTrigger>
          <TabsTrigger value="charts">Grafik</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Data Service</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">No</TableHead>
                      <TableHead>Nomor Service</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Nopol</TableHead>
                      <TableHead>Kendaraan</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Bengkel</TableHead>
                      <TableHead className="text-right">Biaya</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.services?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Tidak ada data service untuk periode ini
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.services?.map((s: any, i: number) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs">{i + 1}</TableCell>
                          <TableCell className="text-xs font-medium">{s.nomorService}</TableCell>
                          <TableCell className="text-xs">{formatDate(s.tanggalService)}</TableCell>
                          <TableCell className="text-xs">{s.vehicle?.nomorPolisi}</TableCell>
                          <TableCell className="text-xs">{s.vehicle?.merk} {s.vehicle?.type}</TableCell>
                          <TableCell className="text-xs">{s.jenisService}</TableCell>
                          <TableCell className="text-xs">{s.bengkel?.namaBengkel}</TableCell>
                          <TableCell className="text-xs text-right font-medium">{formatRupiah(s.totalBiaya)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-[10px] ${STATUS_COLORS[s.statusService] || ''}`}>
                              {s.statusService}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Biaya Service per Bulan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                      <Tooltip formatter={(value: number) => formatRupiah(value)} />
                      <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total Biaya" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">Belum ada data</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4" /> Distribusi Status Service
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {statusPieData.map((_entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">Belum ada data</div>
                )}
              </CardContent>
            </Card>

            {/* Bengkel distribution */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Distribusi per Bengkel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  {stats?.bengkelDistribution?.map((b: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.count} service</p>
                      </div>
                      <p className="text-sm font-bold">{formatRupiah(b.total)}</p>
                    </div>
                  ))}
                  {(!stats?.bengkelDistribution || stats.bengkelDistribution.length === 0) && (
                    <p className="text-sm text-muted-foreground col-span-3 text-center py-4">Belum ada data</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
