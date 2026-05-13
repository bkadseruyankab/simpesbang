'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Wallet,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  History,
  Bike,
  Car,
  CalendarDays,
  User,
  Gauge,
  FileText,
  CheckCircle2,
  ArrowUpRight,
  CircleDot,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Budget, Vehicle } from '@/types'

// --- Zod Schema ---
const anggaranSchema = z.object({
  tahun: z.number().min(2020).max(2030),
  vehicleId: z.string().min(1, 'Kendaraan wajib dipilih'),
  totalAnggaran: z.number().min(0, 'Total anggaran harus >= 0'),
})

type AnggaranFormValues = z.infer<typeof anggaranSchema>

// --- API helpers ---
async function fetchAnggaran(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`/api/anggaran?${qs}`)
  if (!res.ok) throw new Error('Gagal mengambil data anggaran')
  return res.json()
}

async function fetchAnggaranDetail(id: string) {
  const res = await fetch(`/api/anggaran/${id}`)
  if (!res.ok) throw new Error('Gagal mengambil detail anggaran')
  return res.json()
}

async function fetchVehicles() {
  const res = await fetch('/api/vehicles?isActive=true')
  if (!res.ok) throw new Error('Gagal mengambil data kendaraan')
  return res.json()
}

// --- Format helpers ---
function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function getUsagePercent(total: number, realisasi: number) {
  if (total === 0) return 0
  return Math.min(Math.round((realisasi / total) * 100), 100)
}

function getUsageColor(percent: number) {
  if (percent > 90) return 'text-red-600'
  if (percent > 80) return 'text-amber-600'
  return 'text-emerald-600'
}

function getProgressColor(percent: number) {
  if (percent > 90) return '[&>div]:bg-red-500'
  if (percent > 80) return '[&>div]:bg-amber-500'
  return '[&>div]:bg-emerald-500'
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'AKTIF':
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">AKTIF</Badge>
    case 'NONAKTIF':
      return <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100">NONAKTIF</Badge>
    case 'HABIS':
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">HABIS</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

// --- Summary Card Sub-component ---
function SummaryCardGroup({
  title,
  icon,
  summary,
  isLoading,
  variant = 'default',
}: {
  title: string
  icon: React.ReactNode
  summary?: { totalAnggaran: number; totalRealisasi: number; totalSisaAnggaran: number; overBudgetCount: number }
  isLoading: boolean
  variant?: 'default' | 'roda4' | 'roda2'
}) {
  const accentColor = variant === 'roda4'
    ? 'from-slate-700 to-slate-800'
    : variant === 'roda2'
    ? 'from-slate-600 to-slate-700'
    : 'from-slate-800 to-slate-900'

  const iconBg = variant === 'roda4'
    ? 'bg-slate-100 text-slate-700'
    : variant === 'roda2'
    ? 'bg-slate-100 text-slate-600'
    : 'bg-slate-100 text-slate-800'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-md ${iconBg}`}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-slate-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Anggaran</CardTitle>
            <DollarSign className="h-3.5 w-3.5 text-slate-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-28" />
            ) : (
              <p className="text-lg font-bold">{formatCurrency(summary?.totalAnggaran || 0)}</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-emerald-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Realisasi</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-28" />
            ) : (
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(summary?.totalRealisasi || 0)}</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-amber-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Sisa Anggaran</CardTitle>
            <TrendingDown className="h-3.5 w-3.5 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-28" />
            ) : (
              <p className="text-lg font-bold text-amber-600">{formatCurrency(summary?.totalSisaAnggaran || 0)}</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-red-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Over Budget</CardTitle>
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              <p className="text-lg font-bold text-red-600">{summary?.overBudgetCount || 0}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// --- Progress Ring Component ---
function ProgressRing({ percent, size = 100, strokeWidth = 8 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percent / 100) * circumference

  const color = percent > 90 ? '#ef4444' : percent > 80 ? '#f59e0b' : '#10b981'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold" style={{ color }}>{percent}%</span>
        <span className="text-[10px] text-muted-foreground">terpakai</span>
      </div>
    </div>
  )
}

// --- Main Component ---
export function AnggaranPage() {
  const queryClient = useQueryClient()

  // Filters
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [tahunFilter, setTahunFilter] = useState(String(new Date().getFullYear()))
  const [statusFilter, setStatusFilter] = useState('all')
  const [jenisTab, setJenisTab] = useState('all')
  const limit = 10

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['anggaran', page, search, tahunFilter, statusFilter, jenisTab],
    queryFn: () => fetchAnggaran({
      page: String(page),
      limit: String(limit),
      search,
      tahun: tahunFilter,
      statusAnggaran: statusFilter === 'all' ? '' : statusFilter,
      jenisKendaraan: jenisTab === 'all' ? '' : jenisTab,
    }),
  })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-for-select'],
    queryFn: fetchVehicles,
  })

  const { data: detail } = useQuery({
    queryKey: ['anggaran-detail', selectedId],
    queryFn: () => fetchAnggaranDetail(selectedId!),
    enabled: !!selectedId && detailOpen,
  })

  // Form
  const form = useForm<AnggaranFormValues>({
    resolver: zodResolver(anggaranSchema),
    defaultValues: {
      tahun: new Date().getFullYear(),
      vehicleId: '',
      totalAnggaran: 0,
    },
  })

  // Watch vehicleId to auto-detect jenisKendaraan
  const watchedVehicleId = form.watch('vehicleId')
  const vehicleList = (vehicles as Vehicle[] || [])
  const selectedVehicle = vehicleList.find((v: Vehicle) => v.id === watchedVehicleId)

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (values: AnggaranFormValues) => {
      const payload = {
        ...values,
        jenisKendaraan: selectedVehicle?.jenisKendaraan || 'RODA_4',
      }
      const res = await fetch('/api/anggaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal membuat anggaran')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Anggaran berhasil ditambahkan')
      queryClient.invalidateQueries({ queryKey: ['anggaran'] })
      setFormOpen(false)
      form.reset()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: AnggaranFormValues }) => {
      const payload = {
        ...values,
        jenisKendaraan: selectedVehicle?.jenisKendaraan || 'RODA_4',
      }
      const res = await fetch(`/api/anggaran/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal mengupdate anggaran')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Anggaran berhasil diupdate')
      queryClient.invalidateQueries({ queryKey: ['anggaran'] })
      queryClient.invalidateQueries({ queryKey: ['anggaran-detail'] })
      setFormOpen(false)
      form.reset()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/anggaran/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menghapus anggaran')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Anggaran berhasil dihapus')
      queryClient.invalidateQueries({ queryKey: ['anggaran'] })
      setDeleteOpen(false)
      setSelectedId(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // Handlers
  function handleAdd() {
    setEditMode(false)
    form.reset({
      tahun: new Date().getFullYear(),
      vehicleId: '',
      totalAnggaran: 0,
    })
    setFormOpen(true)
  }

  function handleEdit(budget: Budget) {
    setEditMode(true)
    setSelectedId(budget.id)
    form.reset({
      tahun: budget.tahun,
      vehicleId: budget.vehicleId,
      totalAnggaran: budget.totalAnggaran,
    })
    setFormOpen(true)
  }

  function handleViewDetail(id: string) {
    setSelectedId(id)
    setDetailOpen(true)
  }

  function handleDelete(id: string) {
    setSelectedId(id)
    setDeleteOpen(true)
  }

  function onSubmit(values: AnggaranFormValues) {
    if (editMode && selectedId) {
      updateMutation.mutate({ id: selectedId, values })
    } else {
      createMutation.mutate(values)
    }
  }

  // Year options
  const currentYear = new Date().getFullYear()
  const yearOptions = useMemo(() => {
    return Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)
  }, [currentYear])

  const watchTotal = form.watch('totalAnggaran')
  const usageWarning = watchTotal > 0

  // Summary cards data
  const summary = data?.summary
  const summaryRoda4 = data?.summaryRoda4
  const summaryRoda2 = data?.summaryRoda2

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Anggaran Kendaraan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Total {data?.total || 0} data anggaran
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Anggaran
        </Button>
      </div>

      {/* Tabs for Jenis Kendaraan */}
      <Tabs value={jenisTab} onValueChange={(v) => { setJenisTab(v); setPage(1) }}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Semua
          </TabsTrigger>
          <TabsTrigger value="RODA_4" className="gap-1.5">
            <Car className="h-3.5 w-3.5" />
            Roda 4
          </TabsTrigger>
          <TabsTrigger value="RODA_2" className="gap-1.5">
            <Bike className="h-3.5 w-3.5" />
            Roda 2
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Cards - separate for Roda 4 and Roda 2 */}
      <div className="space-y-4">
        <SummaryCardGroup
          title="Anggaran Roda 4"
          icon={<Car className="h-4 w-4" />}
          summary={summaryRoda4}
          isLoading={isLoading}
          variant="roda4"
        />
        <Separator />
        <SummaryCardGroup
          title="Anggaran Roda 2"
          icon={<Bike className="h-4 w-4" />}
          summary={summaryRoda2}
          isLoading={isLoading}
          variant="roda2"
        />
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor polisi..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Select value={tahunFilter} onValueChange={(v) => { setTahunFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="AKTIF">AKTIF</SelectItem>
                <SelectItem value="NONAKTIF">NONAKTIF</SelectItem>
                <SelectItem value="HABIS">HABIS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.data?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Wallet className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">Belum ada data anggaran</p>
              <p className="text-sm">Tambahkan anggaran untuk kendaraan dinas</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Tahun</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Nomor Polisi</TableHead>
                      <TableHead>Nama Pengguna</TableHead>
                      <TableHead className="text-right">Total Anggaran</TableHead>
                      <TableHead className="text-right">Realisasi</TableHead>
                      <TableHead className="text-right">Sisa Anggaran</TableHead>
                      <TableHead>Penggunaan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-28">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((budget: Budget & { vehicle?: Vehicle }, idx: number) => {
                      const usagePercent = getUsagePercent(budget.totalAnggaran, budget.realisasi)
                      const jk = budget.jenisKendaraan || budget.vehicle?.jenisKendaraan
                      return (
                        <TableRow key={budget.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{(page - 1) * limit + idx + 1}</TableCell>
                          <TableCell>{budget.tahun}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] gap-1">
                              {jk === 'RODA_2' ? <Bike className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                              {jk === 'RODA_2' ? 'Roda 2' : 'Roda 4'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{budget.vehicle?.nomorPolisi || '-'}</TableCell>
                          <TableCell>{budget.vehicle?.namaPengguna || '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(budget.totalAnggaran)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(budget.realisasi)}</TableCell>
                          <TableCell className={`text-right font-medium ${budget.sisaAnggaran < 0 ? 'text-red-600' : ''}`}>
                            {formatCurrency(budget.sisaAnggaran)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Progress value={usagePercent} className={`h-2 flex-1 ${getProgressColor(usagePercent)}`} />
                              <span className={`text-xs font-medium w-9 text-right ${getUsageColor(usagePercent)}`}>
                                {usagePercent}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(budget.statusAnggaran)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetail(budget.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(budget)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(budget.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Menampilkan {((page - 1) * limit) + 1}–{Math.min(page * limit, data.total)} dari {data.total} data
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">{page} / {data.totalPages || 1}</span>
                  <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) form.reset() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Anggaran' : 'Tambah Anggaran'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="tahun"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tahun</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tahun" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {yearOptions.map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kendaraan</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kendaraan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(vehicleList).map((v: Vehicle) => (
                          <SelectItem key={v.id} value={v.id}>
                            <div className="flex items-center gap-2">
                              {v.jenisKendaraan === 'RODA_2' ? <Bike className="h-3.5 w-3.5" /> : <Car className="h-3.5 w-3.5" />}
                              {v.nomorPolisi} - {v.namaPengguna} ({v.merk})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {/* Auto-detected jenisKendaraan badge */}
                    {selectedVehicle && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px] gap-1 bg-slate-50">
                          {selectedVehicle.jenisKendaraan === 'RODA_2' ? <Bike className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                          {selectedVehicle.jenisKendaraan === 'RODA_2' ? 'Roda 2' : 'Roda 4'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">terdeteksi otomatis</span>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalAnggaran"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Anggaran (Rp)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {usageWarning && watchTotal > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Perhatian</span>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    Pastikan total anggaran sesuai dengan alokasi dana setiap kendaraan dinas
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setFormOpen(false); form.reset() }}>
                  Batal
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? 'Menyimpan...' : editMode ? 'Update' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Anggaran</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus anggaran ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedId && deleteMutation.mutate(selectedId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Sheet - Modernized */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto p-0">
          {detail ? (
            <div className="flex flex-col">
              {/* Gradient Header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Detail Anggaran</h2>
                      <p className="text-sm text-slate-300">{detail.vehicle?.nomorPolisi} — Tahun {detail.tahun}</p>
                    </div>
                  </div>
                  {getStatusBadge(detail.statusAnggaran)}
                </div>
                {/* Large budget amount */}
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Total Anggaran</p>
                    <p className="text-3xl font-bold mt-1">{formatCurrency(detail.totalAnggaran)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] gap-1 bg-white/10 text-white border-white/20">
                      {detail.jenisKendaraan === 'RODA_2' ? <Bike className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                      {detail.jenisKendaraan === 'RODA_2' ? 'Roda 2' : 'Roda 4'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Progress Ring & Budget Breakdown */}
                <div className="flex items-center gap-6">
                  <ProgressRing percent={getUsagePercent(detail.totalAnggaran, detail.realisasi)} />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-3 w-3 rounded-full bg-emerald-500" />
                        <span className="text-muted-foreground">Realisasi</span>
                      </div>
                      <span className="font-bold text-emerald-600">{formatCurrency(detail.realisasi)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-3 w-3 rounded-full bg-amber-500" />
                        <span className="text-muted-foreground">Sisa Anggaran</span>
                      </div>
                      <span className={`font-bold ${detail.sisaAnggaran < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {formatCurrency(detail.sisaAnggaran)}
                      </span>
                    </div>
                    {detail.sisaAnggaran < 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <span className="text-red-600 font-medium">Over Budget!</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Info Card */}
                <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-slate-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="h-1 w-4 rounded-full bg-slate-700" />
                      Informasi Kendaraan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-start gap-2">
                        <Car className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Nomor Polisi</p>
                          <p className="font-semibold">{detail.vehicle?.nomorPolisi}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Nama Pengguna</p>
                          <p className="font-semibold">{detail.vehicle?.namaPengguna}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Gauge className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Merk / Tipe</p>
                          <p className="font-semibold">{detail.vehicle?.merk} {detail.vehicle?.type}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Tahun Anggaran</p>
                          <p className="font-semibold">{detail.tahun}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Budget History - Timeline Style */}
                <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-slate-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="h-1 w-4 rounded-full bg-slate-700" />
                      <History className="h-4 w-4" />
                      Riwayat Perubahan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detail.history?.length ? (
                      <ScrollArea className="max-h-48">
                        <div className="relative pl-6">
                          {/* Timeline line */}
                          <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200" />
                          <div className="space-y-4">
                            {detail.history.map((h: { id: string; perubahan: number; keterangan: string | null; createdAt: string }, idx: number) => (
                              <div key={h.id} className="relative flex items-start gap-3">
                                <div className={`absolute -left-4 mt-1.5 h-3 w-3 rounded-full border-2 border-white ${idx === 0 ? 'bg-slate-700' : 'bg-slate-300'} z-10`} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{h.keterangan || 'Perubahan anggaran'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(h.createdAt).toLocaleDateString('id-ID', {
                                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                    })}
                                    {h.perubahan !== 0 && (
                                      <span className={`ml-2 font-medium ${h.perubahan > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {h.perubahan > 0 ? '+' : ''}{formatCurrency(h.perubahan)}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground">Belum ada riwayat perubahan</p>
                    )}
                  </CardContent>
                </Card>

                {/* Related Services - Modern Cards */}
                {detail.relatedServices?.length > 0 && (
                  <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-slate-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="h-1 w-4 rounded-full bg-slate-700" />
                        <FileText className="h-4 w-4" />
                        Service Terkait
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-64">
                        <div className="space-y-2">
                          {detail.relatedServices.map((s: { id: string; nomorService: string; tanggalService: string; totalBiaya: number; bengkel?: { namaBengkel: string } }, idx: number) => (
                            <div
                              key={s.id}
                              className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-colors hover:bg-muted/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{s.nomorService}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(s.tanggalService).toLocaleDateString('id-ID')} • {s.bengkel?.namaBengkel || '-'}
                                  </p>
                                </div>
                              </div>
                              <span className="font-bold text-emerald-600">{formatCurrency(s.totalBiaya)}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      {/* Total summary card */}
                      <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Realisasi dari Service</span>
                          <span className="text-lg font-bold">{formatCurrency(detail.realisasi)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <Skeleton className="h-40 w-full" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
