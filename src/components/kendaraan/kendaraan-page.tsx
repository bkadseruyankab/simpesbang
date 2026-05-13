'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Plus, Search, Filter, Edit2, Trash2, Eye, Download, Upload,
  X, FileText, Bike, Car, ChevronLeft, ChevronRight, MoreHorizontal,
  Wallet, DollarSign, TrendingUp, TrendingDown
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

const vehicleSchema = z.object({
  nomorPolisi: z.string().min(1, 'Nomor polisi wajib diisi'),
  namaPengguna: z.string().min(1, 'Nama pengguna wajib diisi'),
  skpdBidang: z.string().min(1, 'SKPD/Bidang wajib diisi'),
  jenisKendaraan: z.enum(['RODA_2', 'RODA_4']),
  merk: z.string().min(1, 'Merk wajib diisi'),
  type: z.string().min(1, 'Type wajib diisi'),
  tahun: z.coerce.number().min(2000, 'Tahun minimal 2000').max(2030, 'Tahun maksimal 2030'),
  nomorRangka: z.string().optional(),
  nomorMesin: z.string().optional(),
  warna: z.string().optional(),
  statusKendaraan: z.enum(['AKTIF', 'NONAKTIF', 'RUSAK']),
  kondisiKendaraan: z.enum(['BAIK', 'KURANG_BAIK', 'RUSAK']),
  kilometerTerakhir: z.coerce.number().min(0, 'Kilometer tidak boleh negatif'),
})

type VehicleForm = z.infer<typeof vehicleSchema>

const statusColors: Record<string, string> = {
  AKTIF: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  NONAKTIF: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  RUSAK: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}
const kondisiColors: Record<string, string> = {
  BAIK: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  KURANG_BAIK: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  RUSAK: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function KendaraanPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [jenisFilter, setJenisFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const limit = 10

  // Debounce search
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch vehicles
  const { data, isLoading } = useQuery({
    queryKey: ['kendaraan', page, debouncedSearch, jenisFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (jenisFilter !== 'all') params.set('jenisKendaraan', jenisFilter)
      if (statusFilter !== 'all') params.set('statusKendaraan', statusFilter)
      const res = await fetch(`/api/kendaraan?${params}`)
      return res.json()
    },
  })

  // Fetch vehicle detail
  const { data: detailData } = useQuery({
    queryKey: ['kendaraan-detail', selectedVehicle?.id],
    queryFn: async () => {
      const res = await fetch(`/api/kendaraan/${selectedVehicle.id}`)
      return res.json()
    },
    enabled: !!selectedVehicle && showDetail,
  })

  // Create vehicle
  const createMutation = useMutation({
    mutationFn: async (data: VehicleForm) => {
      const res = await fetch('/api/kendaraan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal menambah kendaraan') }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Kendaraan berhasil ditambahkan')
      queryClient.invalidateQueries({ queryKey: ['kendaraan'] })
      setShowAdd(false)
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Update vehicle
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleForm> }) => {
      const res = await fetch(`/api/kendaraan/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal mengubah kendaraan') }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Kendaraan berhasil diperbarui')
      queryClient.invalidateQueries({ queryKey: ['kendaraan'] })
      setShowEdit(false)
      setSelectedVehicle(null)
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Delete vehicle
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/kendaraan/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus kendaraan')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Kendaraan berhasil dihapus')
      queryClient.invalidateQueries({ queryKey: ['kendaraan'] })
    },
    onError: () => toast.error('Gagal menghapus kendaraan'),
  })

  // Form
  const form = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      nomorPolisi: '', namaPengguna: '', skpdBidang: '', jenisKendaraan: 'RODA_4',
      merk: '', type: '', tahun: 2024, nomorRangka: '', nomorMesin: '', warna: '',
      statusKendaraan: 'AKTIF', kondisiKendaraan: 'BAIK', kilometerTerakhir: 0,
    },
  })

  const openEdit = (vehicle: any) => {
    setSelectedVehicle(vehicle)
    form.reset({
      nomorPolisi: vehicle.nomorPolisi, namaPengguna: vehicle.namaPengguna,
      skpdBidang: vehicle.skpdBidang, jenisKendaraan: vehicle.jenisKendaraan,
      merk: vehicle.merk, type: vehicle.type, tahun: vehicle.tahun,
      nomorRangka: vehicle.nomorRangka || '', nomorMesin: vehicle.nomorMesin || '',
      warna: vehicle.warna || '', statusKendaraan: vehicle.statusKendaraan,
      kondisiKendaraan: vehicle.kondisiKendaraan, kilometerTerakhir: vehicle.kilometerTerakhir,
    })
    setShowEdit(true)
  }

  const openDetail = (vehicle: any) => {
    setSelectedVehicle(vehicle)
    setShowDetail(true)
  }

  const onSubmit = (data: VehicleForm) => {
    if (showEdit && selectedVehicle) {
      updateMutation.mutate({ id: selectedVehicle.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const vehicles = data?.data || []
  const totalPages = data?.totalPages || 1
  const total = data?.total || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Data Kendaraan
            <Badge variant="secondary" className="text-xs">{total} unit</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">Kelola data kendaraan operasional dinas</p>
        </div>
        <Button onClick={() => { form.reset(); setShowAdd(true) }} className="gap-2">
          <Plus className="h-4 w-4" /> Tambah Kendaraan
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor polisi, nama, merk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={jenisFilter} onValueChange={setJenisFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Jenis" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenis</SelectItem>
            <SelectItem value="RODA_2">Roda 2</SelectItem>
            <SelectItem value="RODA_4">Roda 4</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="AKTIF">Aktif</SelectItem>
            <SelectItem value="NONAKTIF">Nonaktif</SelectItem>
            <SelectItem value="RUSAK">Rusak</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-xs text-muted-foreground">No</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground">Nomor Polisi</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground">Pengguna</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground hidden md:table-cell">SKPD/Bidang</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground">Jenis</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground hidden lg:table-cell">Merk/Type</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground hidden lg:table-cell">Tahun</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground hidden xl:table-cell">Kondisi</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground hidden xl:table-cell">KM</th>
                <th className="text-right p-3 font-medium text-xs text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b"><td colSpan={11} className="p-3"><Skeleton className="h-8 w-full" /></td></tr>
                ))
              ) : vehicles.length === 0 ? (
                <tr><td colSpan={11} className="p-8 text-center text-muted-foreground text-xs">Tidak ada data kendaraan</td></tr>
              ) : (
                vehicles.map((v: any, i: number) => (
                  <tr key={v.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openDetail(v)}>
                    <td className="p-3 text-xs">{(page - 1) * limit + i + 1}</td>
                    <td className="p-3 font-medium text-xs">{v.nomorPolisi}</td>
                    <td className="p-3 text-xs">{v.namaPengguna}</td>
                    <td className="p-3 text-xs hidden md:table-cell">{v.skpdBidang}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] gap-1">
                        {v.jenisKendaraan === 'RODA_2' ? <Bike className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                        {v.jenisKendaraan === 'RODA_2' ? 'Roda 2' : 'Roda 4'}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs hidden lg:table-cell">{v.merk} {v.type}</td>
                    <td className="p-3 text-xs hidden lg:table-cell">{v.tahun}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[v.statusKendaraan] || ''}`}>
                        {v.statusKendaraan}
                      </span>
                    </td>
                    <td className="p-3 hidden xl:table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${kondisiColors[v.kondisiKendaraan] || ''}`}>
                        {v.kondisiKendaraan === 'KURANG_BAIK' ? 'Kurang Baik' : v.kondisiKendaraan}
                      </span>
                    </td>
                    <td className="p-3 text-xs hidden xl:table-cell">{v.kilometerTerakhir?.toLocaleString()} km</td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(v)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Kendaraan?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Kendaraan {v.nomorPolisi} akan dinonaktifkan. Data tidak akan dihapus permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(v.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t">
          <p className="text-xs text-muted-foreground">
            Menampilkan {vehicles.length} dari {total} data
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd || showEdit} onOpenChange={(open) => { if (!open) { setShowAdd(false); setShowEdit(false); setSelectedVehicle(null) } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showEdit ? 'Edit Kendaraan' : 'Tambah Kendaraan'}</DialogTitle>
            <DialogDescription>
              {showEdit ? 'Perbarui informasi kendaraan' : 'Isi data kendaraan baru'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Nomor Polisi *</Label>
                <Input {...form.register('nomorPolisi')} placeholder="D 1234 AB" className="h-9" />
                {form.formState.errors.nomorPolisi && <p className="text-[10px] text-destructive">{form.formState.errors.nomorPolisi.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Nama Pengguna *</Label>
                <Input {...form.register('namaPengguna')} placeholder="Nama pengguna" className="h-9" />
                {form.formState.errors.namaPengguna && <p className="text-[10px] text-destructive">{form.formState.errors.namaPengguna.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">SKPD/Bidang *</Label>
                <Input {...form.register('skpdBidang')} placeholder="Bidang Keuangan" className="h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Jenis Kendaraan *</Label>
                <Select value={form.watch('jenisKendaraan')} onValueChange={(v) => form.setValue('jenisKendaraan', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RODA_2">Roda 2</SelectItem>
                    <SelectItem value="RODA_4">Roda 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Merk *</Label>
                <Input {...form.register('merk')} placeholder="Honda" className="h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Type *</Label>
                <Input {...form.register('type')} placeholder="Supra X 125" className="h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tahun *</Label>
                <Input {...form.register('tahun')} type="number" placeholder="2024" className="h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Warna</Label>
                <Input {...form.register('warna')} placeholder="Hitam" className="h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Nomor Rangka</Label>
                <Input {...form.register('nomorRangka')} placeholder="MH1..." className="h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Nomor Mesin</Label>
                <Input {...form.register('nomorMesin')} placeholder="NF..." className="h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Status Kendaraan</Label>
                <Select value={form.watch('statusKendaraan')} onValueChange={(v) => form.setValue('statusKendaraan', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AKTIF">Aktif</SelectItem>
                    <SelectItem value="NONAKTIF">Nonaktif</SelectItem>
                    <SelectItem value="RUSAK">Rusak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Kondisi Kendaraan</Label>
                <Select value={form.watch('kondisiKendaraan')} onValueChange={(v) => form.setValue('kondisiKendaraan', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAIK">Baik</SelectItem>
                    <SelectItem value="KURANG_BAIK">Kurang Baik</SelectItem>
                    <SelectItem value="RUSAK">Rusak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs">Kilometer Terakhir</Label>
                <Input {...form.register('kilometerTerakhir')} type="number" placeholder="0" className="h-9" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setShowEdit(false) }}>Batal</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : showEdit ? 'Perbarui' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet - Modernized */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          {detailData ? (
            <div className="flex flex-col">
              {/* Gradient Header with vehicle type icon and nomorPolisi */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                    {detailData.jenisKendaraan === 'RODA_2' ? <Bike className="h-5 w-5" /> : <Car className="h-5 w-5" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{detailData.nomorPolisi}</h2>
                    <p className="text-sm text-slate-300">{detailData.merk} {detailData.type} • {detailData.tahun}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px] gap-1 bg-white/10 text-white border-white/20">
                    {detailData.jenisKendaraan === 'RODA_2' ? <Bike className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                    {detailData.jenisKendaraan === 'RODA_2' ? 'Roda 2' : 'Roda 4'}
                  </Badge>
                  <span className={'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium ' + (statusColors[detailData.statusKendaraan] || '')}>
                    {detailData.statusKendaraan}
                  </span>
                  <span className={'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium ' + (kondisiColors[detailData.kondisiKendaraan] || '')}>
                    {detailData.kondisiKendaraan === 'KURANG_BAIK' ? 'Kurang Baik' : detailData.kondisiKendaraan}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Vehicle Info Card */}
                <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-slate-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="h-1 w-4 rounded-full bg-slate-700" />
                      <FileText className="h-4 w-4" />
                      Informasi Kendaraan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-start gap-2">
                        <Car className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Pengguna</p>
                          <p className="font-semibold">{detailData.namaPengguna}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">SKPD/Bidang</p>
                          <p className="font-semibold">{detailData.skpdBidang}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Bike className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Merk / Tipe</p>
                          <p className="font-semibold">{detailData.merk} {detailData.type}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Plus className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Tahun</p>
                          <p className="font-semibold">{detailData.tahun}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Search className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">No. Rangka</p>
                          <p className="font-semibold">{detailData.nomorRangka || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Search className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">No. Mesin</p>
                          <p className="font-semibold">{detailData.nomorMesin || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Edit2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Warna</p>
                          <p className="font-semibold">{detailData.warna || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Kilometer</p>
                          <p className="font-semibold">{detailData.kilometerTerakhir?.toLocaleString()} km</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Budget Info Section */}
                {detailData.budgets && detailData.budgets.length > 0 && (
                  <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-emerald-50/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="h-1 w-4 rounded-full bg-emerald-600" />
                        <span className="h-4 w-4 inline-flex items-center justify-center text-emerald-600">💰</span>
                        Informasi Anggaran
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {detailData.budgets.slice(0, 3).map((b: any) => (
                          <div key={b.id} className="flex items-center justify-between p-2.5 rounded-lg border text-sm">
                            <div>
                              <p className="font-medium">Tahun {b.tahun}</p>
                              <p className="text-xs text-muted-foreground">
                                Realisasi: Rp {b.realisasi?.toLocaleString('id-ID')} / Rp {b.totalAnggaran?.toLocaleString('id-ID')}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ' + (
                                b.statusAnggaran === 'AKTIF' ? 'bg-emerald-100 text-emerald-700' :
                                b.statusAnggaran === 'HABIS' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                              )}>
                                {b.statusAnggaran}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Documents Section with file type badges */}
                <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-slate-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="h-1 w-4 rounded-full bg-slate-700" />
                      <FileText className="h-4 w-4" />
                      Dokumen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detailData.documents?.length > 0 ? (
                      <div className="space-y-2">
                        {detailData.documents.map((doc: any) => {
                          const ext = doc.fileName?.split('.').pop()?.toLowerCase() || ''
                          const extColors: Record<string, string> = {
                            pdf: 'bg-red-100 text-red-700',
                            doc: 'bg-blue-100 text-blue-700',
                            docx: 'bg-blue-100 text-blue-700',
                            jpg: 'bg-purple-100 text-purple-700',
                            jpeg: 'bg-purple-100 text-purple-700',
                            png: 'bg-purple-100 text-purple-700',
                          }
                          return (
                            <div key={doc.id} className="flex items-center gap-3 text-sm p-2.5 rounded-lg border hover:bg-muted/50 transition-colors">
                              <Badge variant="outline" className={'text-[10px] font-bold ' + (extColors[ext] || 'bg-gray-100 text-gray-700')}>
                                .{ext.toUpperCase() || 'FILE'}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{doc.fileName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {doc.jenisDokumen && (
                                    <span className="text-[10px] text-muted-foreground">{doc.jenisDokumen}</span>
                                  )}
                                  {doc.fileSize && (
                                    <span className="text-[10px] text-muted-foreground">{(doc.fileSize / 1024).toFixed(0)} KB</span>
                                  )}
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="h-7">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Belum ada dokumen</p>
                    )}
                  </CardContent>
                </Card>

                {/* Service History - Mini Timeline */}
                <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-slate-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="h-1 w-4 rounded-full bg-slate-700" />
                      Riwayat Service
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detailData.services?.length > 0 ? (
                      <div className="relative pl-6">
                        {/* Timeline line */}
                        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200" />
                        <div className="space-y-3">
                          {detailData.services.slice(0, 5).map((s: any, idx: number) => (
                            <div key={s.id} className="relative">
                              <div className={'absolute -left-4 mt-1.5 h-3 w-3 rounded-full border-2 border-white ' + (idx === 0 ? 'bg-slate-700' : 'bg-slate-300') + ' z-10'} />
                              <div className="flex items-center justify-between p-2.5 rounded-lg border text-sm">
                                <div>
                                  <p className="font-medium">{s.nomorService}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(s.tanggalService).toLocaleDateString('id-ID')}
                                    {s.bengkel?.namaBengkel && (' • ' + s.bengkel.namaBengkel)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium">Rp {s.totalBiaya?.toLocaleString()}</span>
                                  <Badge variant="outline" className="text-[10px]">{s.statusService}</Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {detailData.totalBiayaService > 0 && (
                          <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 border">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Total Biaya Service</span>
                              <span className="text-lg font-bold">Rp {detailData.totalBiayaService?.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Belum ada riwayat service</p>
                    )}
                  </CardContent>
                </Card>

                {/* Edit Button */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => { setShowDetail(false); openEdit(detailData) }}>
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </Button>
                </div>
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
