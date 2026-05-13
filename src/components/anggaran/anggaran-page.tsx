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

// --- Main Component ---
export function AnggaranPage() {
  const queryClient = useQueryClient()

  // Filters
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [tahunFilter, setTahunFilter] = useState(String(new Date().getFullYear()))
  const [statusFilter, setStatusFilter] = useState('all')
  const limit = 10

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['anggaran', page, search, tahunFilter, statusFilter],
    queryFn: () => fetchAnggaran({
      page: String(page),
      limit: String(limit),
      search,
      tahun: tahunFilter,
      statusAnggaran: statusFilter === 'all' ? '' : statusFilter,
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

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (values: AnggaranFormValues) => {
      const res = await fetch('/api/anggaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
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
      const res = await fetch(`/api/anggaran/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Anggaran {tahunFilter}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-36" />
            ) : (
              <p className="text-2xl font-bold">{formatCurrency(summary?.totalAnggaranTahun || 0)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Realisasi</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-36" />
            ) : (
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary?.totalRealisasi || 0)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sisa Anggaran</CardTitle>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-36" />
            ) : (
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary?.totalSisaAnggaran || 0)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Over Budget</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-2xl font-bold text-red-600">{summary?.overBudgetCount || 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
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
      <Card>
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
                      return (
                        <TableRow key={budget.id}>
                          <TableCell className="font-medium">{(page - 1) * limit + idx + 1}</TableCell>
                          <TableCell>{budget.tahun}</TableCell>
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
                        {(vehicles as Vehicle[] || []).map((v: Vehicle) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.nomorPolisi} - {v.namaPengguna} ({v.merk})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
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

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Detail Anggaran
            </SheetTitle>
          </SheetHeader>
          {detail ? (
            <div className="mt-6 space-y-6">
              {/* Budget Info Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Informasi Anggaran</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tahun</p>
                      <p className="font-medium">{detail.tahun}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      {getStatusBadge(detail.statusAnggaran)}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Nomor Polisi</p>
                      <p className="font-medium">{detail.vehicle?.nomorPolisi}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Nama Pengguna</p>
                      <p className="font-medium">{detail.vehicle?.namaPengguna}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Merk / Tipe</p>
                      <p className="font-medium">{detail.vehicle?.merk} {detail.vehicle?.type}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Anggaran</span>
                      <span className="font-semibold">{formatCurrency(detail.totalAnggaran)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Realisasi</span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(detail.realisasi)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sisa Anggaran</span>
                      <span className={`font-semibold ${detail.sisaAnggaran < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {formatCurrency(detail.sisaAnggaran)}
                      </span>
                    </div>
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>Penggunaan Anggaran</span>
                        <span className={getUsageColor(getUsagePercent(detail.totalAnggaran, detail.realisasi))}>
                          {getUsagePercent(detail.totalAnggaran, detail.realisasi)}%
                        </span>
                      </div>
                      <Progress
                        value={getUsagePercent(detail.totalAnggaran, detail.realisasi)}
                        className={`h-3 ${getProgressColor(getUsagePercent(detail.totalAnggaran, detail.realisasi))}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Budget History */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Riwayat Perubahan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {detail.history?.length ? (
                    <ScrollArea className="max-h-48">
                      <div className="space-y-3">
                        {detail.history.map((h: { id: string; perubahan: number; keterangan: string | null; createdAt: string }) => (
                          <div key={h.id} className="flex items-start gap-3 text-sm">
                            <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{h.keterangan || 'Perubahan anggaran'}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(h.createdAt).toLocaleDateString('id-ID', {
                                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                })}
                                {h.perubahan !== 0 && ` • ${h.perubahan > 0 ? '+' : ''}${formatCurrency(h.perubahan)}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground">Belum ada riwayat perubahan</p>
                  )}
                </CardContent>
              </Card>

              {/* Related Services */}
              {detail.relatedServices?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Service Terkait</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-64">
                      <div className="space-y-2">
                        {detail.relatedServices.map((s: { id: string; nomorService: string; tanggalService: string; totalBiaya: number; bengkel?: { namaBengkel: string } }) => (
                          <div key={s.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                            <div>
                              <p className="font-medium">{s.nomorService}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(s.tanggalService).toLocaleDateString('id-ID')} • {s.bengkel?.namaBengkel || '-'}
                              </p>
                            </div>
                            <span className="font-medium text-emerald-600">{formatCurrency(s.totalBiaya)}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
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
