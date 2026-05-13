'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Archive,
  ShoppingCart,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import type { SparePart } from '@/types'

// --- Zod Schema ---
const sukuCadangSchema = z.object({
  namaSukuCadang: z.string().min(1, 'Nama suku cadang wajib diisi'),
  qty: z.number().min(0).default(0),
  hargaSatuan: z.number().min(0).default(0),
  supplier: z.string().optional().default(''),
  stok: z.number().min(0).default(0),
  keterangan: z.string().optional().default(''),
  isActive: z.boolean().default(true),
})

type SukuCadangFormValues = z.infer<typeof sukuCadangSchema>

// --- API helpers ---
async function fetchSukuCadang(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`/api/suku-cadang?${qs}`)
  if (!res.ok) throw new Error('Gagal mengambil data suku cadang')
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

function getStockBadge(stok: number) {
  if (stok === 0) {
    return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Habis</Badge>
  }
  if (stok < 5) {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 gap-1">
        <AlertTriangle className="h-3 w-3" />
        {stok}
      </Badge>
    )
  }
  if (stok < 10) {
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">{stok}</Badge>
  }
  return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">{stok}</Badge>
}

function getActiveBadge(isActive: boolean) {
  return isActive
    ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Aktif</Badge>
    : <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100">Nonaktif</Badge>
}

// --- Main Component ---
export function SukuCadangPage() {
  const queryClient = useQueryClient()

  // Filters
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const limit = 10

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['suku-cadang', page, search],
    queryFn: () => fetchSukuCadang({
      page: String(page),
      limit: String(limit),
      search,
    }),
  })

  // Form
  const form = useForm<SukuCadangFormValues>({
    resolver: zodResolver(sukuCadangSchema),
    defaultValues: {
      namaSukuCadang: '',
      qty: 0,
      hargaSatuan: 0,
      supplier: '',
      stok: 0,
      keterangan: '',
      isActive: true,
    },
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (values: SukuCadangFormValues) => {
      const res = await fetch('/api/suku-cadang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal membuat suku cadang')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Suku cadang berhasil ditambahkan')
      queryClient.invalidateQueries({ queryKey: ['suku-cadang'] })
      setFormOpen(false)
      form.reset()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: SukuCadangFormValues }) => {
      const res = await fetch(`/api/suku-cadang/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal mengupdate suku cadang')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Suku cadang berhasil diupdate')
      queryClient.invalidateQueries({ queryKey: ['suku-cadang'] })
      setFormOpen(false)
      form.reset()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/suku-cadang/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menghapus suku cadang')
      }
      return res.json()
    },
    onSuccess: (result) => {
      toast.success(result.message || 'Suku cadang berhasil dihapus')
      queryClient.invalidateQueries({ queryKey: ['suku-cadang'] })
      setDeleteOpen(false)
      setSelectedId(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // Handlers
  function handleAdd() {
    setEditMode(false)
    form.reset({
      namaSukuCadang: '',
      qty: 0,
      hargaSatuan: 0,
      supplier: '',
      stok: 0,
      keterangan: '',
      isActive: true,
    })
    setFormOpen(true)
  }

  function handleEdit(part: SparePart) {
    setEditMode(true)
    setSelectedId(part.id)
    form.reset({
      namaSukuCadang: part.namaSukuCadang,
      qty: part.qty,
      hargaSatuan: part.hargaSatuan,
      supplier: part.supplier || '',
      stok: part.stok,
      keterangan: part.keterangan || '',
      isActive: part.isActive,
    })
    setFormOpen(true)
  }

  function handleDelete(id: string) {
    setSelectedId(id)
    setDeleteOpen(true)
  }

  function onSubmit(values: SukuCadangFormValues) {
    if (editMode && selectedId) {
      updateMutation.mutate({ id: selectedId, values })
    } else {
      createMutation.mutate(values)
    }
  }

  // Summary
  const summary = data?.summary

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Suku Cadang / Material
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Total {data?.total || 0} item terdaftar
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Suku Cadang
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Item Aktif</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p className="text-2xl font-bold">{summary?.totalItems || 0}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stok Rendah</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-2xl font-bold text-red-600">{summary?.lowStockCount || 0}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Data</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-2xl font-bold">{data?.total || 0}</p>
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
                placeholder="Cari nama suku cadang, supplier..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
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
              <Package className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">Belum ada data suku cadang</p>
              <p className="text-sm">Tambahkan suku cadang untuk persediaan bengkel</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Harga Satuan</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-center">Stok</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((part: SparePart, idx: number) => (
                      <TableRow key={part.id}>
                        <TableCell className="font-medium">{(page - 1) * limit + idx + 1}</TableCell>
                        <TableCell className="font-medium">{part.namaSukuCadang}</TableCell>
                        <TableCell className="text-center">{part.qty}</TableCell>
                        <TableCell className="text-right">{formatCurrency(part.hargaSatuan)}</TableCell>
                        <TableCell>{part.supplier || '-'}</TableCell>
                        <TableCell className="text-center">{getStockBadge(part.stok)}</TableCell>
                        <TableCell>{getActiveBadge(part.isActive)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(part)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(part.id)}>
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
            <DialogTitle>{editMode ? 'Edit Suku Cadang' : 'Tambah Suku Cadang'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="namaSukuCadang"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Suku Cadang *</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama suku cadang" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="qty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hargaSatuan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga Satuan (Rp)</FormLabel>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stok"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stok</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama supplier" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="keterangan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keterangan</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Keterangan tambahan..." className="resize-none" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Status Aktif</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Nonaktifkan jika suku cadang tidak digunakan lagi
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
            <AlertDialogTitle>Hapus Suku Cadang</AlertDialogTitle>
            <AlertDialogDescription>
              Jika suku cadang masih digunakan dalam service, data akan dinonaktifkan alih-alih dihapus. Apakah Anda yakin?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedId && deleteMutation.mutate(selectedId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Memproses...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
