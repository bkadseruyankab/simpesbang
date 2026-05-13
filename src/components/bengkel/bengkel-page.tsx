'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Building2,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Wrench,
  DollarSign,
  Clock,
  CheckCircle2,
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
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Workshop } from '@/types'

// --- Zod Schema ---
const bengkelSchema = z.object({
  namaBengkel: z.string().min(1, 'Nama bengkel wajib diisi'),
  alamat: z.string().optional().default(''),
  noTelepon: z.string().optional().default(''),
  picBengkel: z.string().optional().default(''),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')).default(''),
  statusAktif: z.boolean().default(true),
})

type BengkelFormValues = z.infer<typeof bengkelSchema>

// --- API helpers ---
async function fetchBengkel(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`/api/bengkel?${qs}`)
  if (!res.ok) throw new Error('Gagal mengambil data bengkel')
  return res.json()
}

async function fetchBengkelDetail(id: string) {
  const res = await fetch(`/api/bengkel/${id}`)
  if (!res.ok) throw new Error('Gagal mengambil detail bengkel')
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

function getStatusBadge(statusAktif: boolean) {
  return statusAktif
    ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Aktif</Badge>
    : <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100">Nonaktif</Badge>
}

function getServiceStatusBadge(status: string) {
  const colors: Record<string, string> = {
    'DIAJUKAN': 'bg-blue-100 text-blue-700 border-blue-200',
    'DISETUJUI': 'bg-sky-100 text-sky-700 border-sky-200',
    'DITOLAK': 'bg-red-100 text-red-700 border-red-200',
    'DIPROSES': 'bg-amber-100 text-amber-700 border-amber-200',
    'PENDING': 'bg-orange-100 text-orange-700 border-orange-200',
    'SELESAI': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  }
  return (
    <Badge className={`${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </Badge>
  )
}

// --- Main Component ---
export function BengkelPage() {
  const queryClient = useQueryClient()

  // Filters
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
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
    queryKey: ['bengkel', page, search, statusFilter],
    queryFn: () => fetchBengkel({
      page: String(page),
      limit: String(limit),
      search,
      statusAktif: statusFilter === 'all' ? '' : statusFilter,
    }),
  })

  const { data: detail } = useQuery({
    queryKey: ['bengkel-detail', selectedId],
    queryFn: () => fetchBengkelDetail(selectedId!),
    enabled: !!selectedId && detailOpen,
  })

  // Form
  const form = useForm<BengkelFormValues>({
    resolver: zodResolver(bengkelSchema),
    defaultValues: {
      namaBengkel: '',
      alamat: '',
      noTelepon: '',
      picBengkel: '',
      email: '',
      statusAktif: true,
    },
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (values: BengkelFormValues) => {
      const res = await fetch('/api/bengkel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal membuat bengkel')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Bengkel berhasil ditambahkan')
      queryClient.invalidateQueries({ queryKey: ['bengkel'] })
      setFormOpen(false)
      form.reset()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: BengkelFormValues }) => {
      const res = await fetch(`/api/bengkel/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal mengupdate bengkel')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Bengkel berhasil diupdate')
      queryClient.invalidateQueries({ queryKey: ['bengkel'] })
      queryClient.invalidateQueries({ queryKey: ['bengkel-detail'] })
      setFormOpen(false)
      form.reset()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bengkel/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menghapus bengkel')
      }
      return res.json()
    },
    onSuccess: (result) => {
      toast.success(result.message || 'Bengkel berhasil dinonaktifkan')
      queryClient.invalidateQueries({ queryKey: ['bengkel'] })
      setDeleteOpen(false)
      setSelectedId(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // Handlers
  function handleAdd() {
    setEditMode(false)
    form.reset({
      namaBengkel: '',
      alamat: '',
      noTelepon: '',
      picBengkel: '',
      email: '',
      statusAktif: true,
    })
    setFormOpen(true)
  }

  function handleEdit(workshop: Workshop) {
    setEditMode(true)
    setSelectedId(workshop.id)
    form.reset({
      namaBengkel: workshop.namaBengkel,
      alamat: workshop.alamat || '',
      noTelepon: workshop.noTelepon || '',
      picBengkel: workshop.picBengkel || '',
      email: workshop.email || '',
      statusAktif: workshop.statusAktif,
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

  function onSubmit(values: BengkelFormValues) {
    if (editMode && selectedId) {
      updateMutation.mutate({ id: selectedId, values })
    } else {
      createMutation.mutate(values)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Manajemen Bengkel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Total {data?.total || 0} bengkel terdaftar
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Bengkel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama bengkel, PIC, alamat..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="true">Aktif</SelectItem>
                <SelectItem value="false">Nonaktif</SelectItem>
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
              <Building2 className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">Belum ada data bengkel</p>
              <p className="text-sm">Tambahkan bengkel untuk pengelolaan service</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Nama Bengkel</TableHead>
                      <TableHead>Alamat</TableHead>
                      <TableHead>No Telepon</TableHead>
                      <TableHead>PIC</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Total Service</TableHead>
                      <TableHead className="w-28">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((workshop: Workshop & { _count?: { services: number } }, idx: number) => (
                      <TableRow key={workshop.id}>
                        <TableCell className="font-medium">{(page - 1) * limit + idx + 1}</TableCell>
                        <TableCell className="font-medium">{workshop.namaBengkel}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{workshop.alamat || '-'}</TableCell>
                        <TableCell>{workshop.noTelepon || '-'}</TableCell>
                        <TableCell>{workshop.picBengkel || '-'}</TableCell>
                        <TableCell>{workshop.email || '-'}</TableCell>
                        <TableCell>{getStatusBadge(workshop.statusAktif)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{workshop._count?.services || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetail(workshop.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(workshop)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(workshop.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
            <DialogTitle>{editMode ? 'Edit Bengkel' : 'Tambah Bengkel'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="namaBengkel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Bengkel *</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama bengkel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alamat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan alamat bengkel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="noTelepon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No Telepon</FormLabel>
                      <FormControl>
                        <Input placeholder="08xx-xxxx-xxxx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="picBengkel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIC Bengkel</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama penanggung jawab" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="statusAktif"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Status Aktif</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Nonaktifkan jika bengkel tidak digunakan lagi
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

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
            <AlertDialogTitle>Nonaktifkan Bengkel</AlertDialogTitle>
            <AlertDialogDescription>
              Bengkel akan dinonaktifkan dan tidak akan muncul dalam daftar aktif. Data service yang terkait tidak akan terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedId && deleteMutation.mutate(selectedId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Memproses...' : 'Nonaktifkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Detail Bengkel
            </SheetTitle>
          </SheetHeader>
          {detail ? (
            <div className="mt-6 space-y-6">
              {/* Workshop Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Informasi Bengkel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-lg">{detail.namaBengkel}</span>
                    {getStatusBadge(detail.statusAktif)}
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    {detail.alamat && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span>{detail.alamat}</span>
                      </div>
                    )}
                    {detail.noTelepon && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{detail.noTelepon}</span>
                      </div>
                    )}
                    {detail.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{detail.email}</span>
                      </div>
                    )}
                    {detail.picBengkel && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{detail.picBengkel}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Statistics */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Statistik</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Wrench className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Total Service</p>
                        <p className="text-lg font-bold">{detail.stats?.totalServices || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <DollarSign className="h-5 w-5 text-emerald-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Total Pendapatan</p>
                        <p className="text-lg font-bold">{formatCurrency(detail.stats?.totalRevenue || 0)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Clock className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Rata-rata Selesai</p>
                        <p className="text-lg font-bold">{detail.stats?.avgCompletionDays || 0} hari</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <CheckCircle2 className="h-5 w-5 text-sky-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Selesai</p>
                        <p className="text-lg font-bold">{detail.stats?.completedCount || 0}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Services List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Daftar Service
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {detail.services?.length ? (
                    <ScrollArea className="max-h-80">
                      <div className="space-y-2">
                        {detail.services.map((s: { id: string; nomorService: string; tanggalService: string; totalBiaya: number; statusService: string; vehicle?: { nomorPolisi: string; namaPengguna: string } }) => (
                          <div key={s.id} className="flex items-center justify-between p-3 rounded-md border text-sm">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{s.nomorService}</span>
                                {getServiceStatusBadge(s.statusService)}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {s.vehicle?.nomorPolisi} • {new Date(s.tanggalService).toLocaleDateString('id-ID')}
                              </p>
                            </div>
                            <span className="font-medium text-emerald-600 ml-2">{formatCurrency(s.totalBiaya)}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground">Belum ada service untuk bengkel ini</p>
                  )}
                </CardContent>
              </Card>
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
