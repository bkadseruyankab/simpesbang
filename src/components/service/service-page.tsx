'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Wrench, Plus, Search, Filter, Eye, Edit, Trash2, CheckCircle,
  XCircle, RefreshCw, ChevronLeft, ChevronRight, FileText,
  AlertTriangle, Info, X, Wallet, CalendarIcon, ArrowUpDown,
  Upload, Download, Image as ImageIcon, CalendarDays, History,
  Car, Gauge
} from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { toast } from '@/hooks/use-toast'
import { MultiUpload } from '@/components/shared/multi-upload'
import type { Service, ServiceItem, ServiceDocument, BudgetValidation, StatusService, JenisService, Prioritas } from '@/types'

// ========== Types ==========
interface ServiceFormData {
  tanggalService: string
  vehicleId: string
  bengkelId: string
  jenisService: JenisService
  prioritas: Prioritas
  keterangan: string
  kilometerService: number
  estimasiBiaya: number
  estimasiLamaPerbaikan: number
  items: ServiceItemForm[]
}

interface ServiceItemForm {
  itemName: string
  quantity: number
  hargaSatuan: number
  keterangan: string
}

// ========== Constants ==========
const STATUS_COLORS: Record<StatusService, string> = {
  DIAJUKAN: 'bg-blue-100 text-blue-800 border-blue-200',
  DISETUJUI: 'bg-green-100 text-green-800 border-green-200',
  DITOLAK: 'bg-red-100 text-red-800 border-red-200',
  DIPROSES: 'bg-orange-100 text-orange-800 border-orange-200',
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  SELESAI: 'bg-purple-100 text-purple-800 border-purple-200',
}

const STATUS_LABELS: Record<StatusService, string> = {
  DIAJUKAN: 'Diajukan',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
  DIPROSES: 'Diproses',
  PENDING: 'Pending',
  SELESAI: 'Selesai',
}

const JENIS_SERVICE_OPTIONS: { value: JenisService; label: string }[] = [
  { value: 'RUTIN', label: 'Rutin' },
  { value: 'PERBAIKAN', label: 'Perbaikan' },
  { value: 'DARURAT', label: 'Darurat' },
]

const PRIORITAS_OPTIONS: { value: Prioritas; label: string }[] = [
  { value: 'RENDAH', label: 'Rendah' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'TINGGI', label: 'Tinggi' },
  { value: 'DARURAT', label: 'Darurat' },
]

const BUDGET_LEVEL_COLORS: Record<string, string> = {
  INFO: 'border-blue-300 bg-blue-50 text-blue-800',
  WARNING: 'border-yellow-300 bg-yellow-50 text-yellow-800',
  CRITICAL: 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800',
  ERROR: 'border-red-300 bg-red-50 text-red-800',
}

const BUDGET_LEVEL_ICONS: Record<string, React.ReactNode> = {
  INFO: <Info className="h-5 w-5 text-blue-600" />,
  WARNING: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  CRITICAL: <AlertTriangle className="h-5 w-5 text-fuchsia-600" />,
  ERROR: <XCircle className="h-5 w-5 text-red-600" />,
}

// ========== Format helpers ==========
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string | Date): string {
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return format(d, 'dd MMM yyyy', { locale: localeId })
  } catch {
    return '-'
  }
}

// ========== Main Component ==========
export function ServicePage() {
  const queryClient = useQueryClient()

  // State
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterBengkel, setFilterBengkel] = useState<string>('')
  const [filterJenis, setFilterJenis] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  // Modal states
  const [showAddEdit, setShowAddEdit] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [showApproval, setShowApproval] = useState(false)
  const [approvalService, setApprovalService] = useState<Service | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const [progressService, setProgressService] = useState<Service | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [detailService, setDetailService] = useState<Service | null>(null)
  const [showUploadNota, setShowUploadNota] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [rejectReason, setRejectReason] = useState('')

  // Build query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(page),
      limit: String(limit),
    }
    if (search) params.search = search
    if (filterStatus) params.statusService = filterStatus
    if (filterBengkel) params.bengkelId = filterBengkel
    if (filterJenis) params.jenisService = filterJenis
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    return params
  }, [page, limit, search, filterStatus, filterBengkel, filterJenis, dateFrom, dateTo])

  // Queries
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', queryParams],
    queryFn: async () => {
      const qs = new URLSearchParams(queryParams).toString()
      const res = await fetch(`/api/service?${qs}`)
      if (!res.ok) throw new Error('Gagal mengambil data service')
      return res.json()
    },
  })

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: () => fetch('/api/kendaraan').then(r => r.json()),
  })

  const { data: workshopsData } = useQuery({
    queryKey: ['workshops-list'],
    queryFn: () => fetch('/api/bengkel').then(r => r.json()),
  })

  // Handle both array and {data:[...]} response formats
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData?.data || [])
  const workshops = Array.isArray(workshopsData) ? workshopsData : (workshopsData?.data || [])
  const services = servicesData?.data || []
  const pagination = servicesData?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const res = await fetch('/api/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal membuat service') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Service berhasil dibuat' })
      setShowAddEdit(false)
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: ServiceFormData & { id: string }) => {
      const res = await fetch(`/api/service/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal mengupdate service') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Service berhasil diupdate' })
      setShowAddEdit(false)
      setEditingService(null)
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/service/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus service')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Service berhasil dihapus' })
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (data: { id: string; action: 'approve' | 'reject'; rejectedReason?: string }) => {
      const res = await fetch(`/api/service/${data.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: data.action, rejectedReason: data.rejectedReason }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal memproses') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Service berhasil diproses' })
      setShowApproval(false)
      setApprovalService(null)
      setRejectReason('')
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    },
  })

  const progressMutation = useMutation({
    mutationFn: async (data: { id: string; progress: number; statusService?: string; catatanBengkel?: string }) => {
      const res = await fetch(`/api/service/${data.id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal mengupdate progress') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Progress berhasil diupdate' })
      setShowProgress(false)
      setProgressService(null)
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    },
  })

  // Upload Nota mutation
  const uploadNotaMutation = useMutation({
    mutationFn: async ({ serviceId, files, jenisDokumen }: { serviceId: string; files: File[]; jenisDokumen: string }) => {
      const formData = new FormData()
      files.forEach((file) => formData.append('files', file))
      formData.append('jenisDokumen', jenisDokumen)

      // Simulate progress
      setUploadProgress(10)

      const res = await fetch(`/api/service/${serviceId}/documents`, {
        method: 'POST',
        body: formData,
      })

      setUploadProgress(80)

      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal mengupload nota') }
      const result = await res.json()
      setUploadProgress(100)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-detail', detailService?.id] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Nota berhasil diupload' })
      setShowUploadNota(false)
      setUploadProgress(0)
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
      setUploadProgress(0)
    },
  })

  // Delete document mutation
  const deleteDocMutation = useMutation({
    mutationFn: async ({ serviceId, docId }: { serviceId: string; docId: string }) => {
      const res = await fetch(`/api/service/${serviceId}/documents/${docId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus dokumen')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-detail', detailService?.id] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Berhasil', description: 'Dokumen berhasil dihapus' })
    },
    onError: (error: Error) => {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' })
    },
  })

  // Detail query
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['service-detail', detailService?.id],
    queryFn: async () => {
      const res = await fetch(`/api/service/${detailService!.id}`)
      if (!res.ok) throw new Error('Gagal mengambil detail')
      return res.json()
    },
    enabled: !!detailService?.id,
  })

  const detail = detailData?.data as Service | undefined

  // Handlers
  const handleAddNew = () => {
    setEditingService(null)
    setShowAddEdit(true)
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setShowAddEdit(true)
  }

  const handleDetail = (service: Service) => {
    setDetailService(service)
    setShowDetail(true)
  }

  const handleApproveReject = (service: Service) => {
    setApprovalService(service)
    setRejectReason('')
    setShowApproval(true)
  }

  const handleProgress = (service: Service) => {
    setProgressService(service)
    setShowProgress(true)
  }

  const handleSubmit = (data: ServiceFormData) => {
    if (editingService) {
      updateMutation.mutate({ ...data, id: editingService.id })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Service Kendaraan
              <Badge variant="secondary" className="text-xs">
                {pagination.total} data
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Kelola service dan perbaikan kendaraan operasional
            </p>
          </div>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Service
        </Button>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nomor service, nopol, bengkel..."
                className="pl-9"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>

          {showFilters && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <Label className="text-xs mb-1">Status</Label>
                <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v === 'ALL' ? '' : v); setPage(1) }}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Status</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1">Bengkel</Label>
                <Select value={filterBengkel} onValueChange={(v) => { setFilterBengkel(v === 'ALL' ? '' : v); setPage(1) }}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Semua Bengkel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Bengkel</SelectItem>
                    {workshops.map((w: { id: string; namaBengkel: string }) => (
                      <SelectItem key={w.id} value={w.id}>{w.namaBengkel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1">Jenis Service</Label>
                <Select value={filterJenis} onValueChange={(v) => { setFilterJenis(v === 'ALL' ? '' : v); setPage(1) }}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Semua Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Jenis</SelectItem>
                    {JENIS_SERVICE_OPTIONS.map((j) => (
                      <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1">Tanggal Mulai</Label>
                <Input type="date" className="h-9 text-sm" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} />
              </div>
              <div>
                <Label className="text-xs mb-1">Tanggal Akhir</Label>
                <Input type="date" className="h-9 text-sm" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {servicesLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Wrench className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Belum ada data service</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-1" /> Tambah Service
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-center">No</TableHead>
                      <TableHead>Nomor Service</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Kendaraan</TableHead>
                      <TableHead>Bengkel</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead className="text-right">Total Biaya</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service: Service, idx: number) => (
                      <TableRow key={service.id} className="hover:bg-muted/50">
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {(page - 1) * limit + idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium">
                          {service.nomorService}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(service.tanggalService)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="text-sm font-medium">{service.vehicle?.nomorPolisi}</span>
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {service.vehicle?.merk} {service.vehicle?.type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{service.bengkel?.namaBengkel}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{service.jenisService}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatRupiah(service.totalBiaya)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs border', STATUS_COLORS[service.statusService as StatusService])}>
                            {STATUS_LABELS[service.statusService as StatusService]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Progress value={service.progress} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-8 text-right">{service.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDetail(service)} title="Detail">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(service.statusService === 'DIAJUKAN' || service.statusService === 'DITOLAK') && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(service)} title="Edit">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {service.statusService === 'DIAJUKAN' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleApproveReject(service)} title="Setujui/Tolak">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {['DISETUJUI', 'DIPROSES', 'PENDING'].includes(service.statusService) && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600" onClick={() => handleProgress(service)} title="Update Progress">
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            {service.statusService !== 'SELESAI' && (
                              <DeleteButton serviceId={service.id} nomorService={service.nomorService} onDelete={() => deleteMutation.mutate(service.id)} isDeleting={deleteMutation.isPending} />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, pagination.total)} dari {pagination.total} data
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">{page} / {pagination.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <ServiceFormDialog
        open={showAddEdit}
        onOpenChange={(open) => { setShowAddEdit(open); if (!open) setEditingService(null) }}
        editingService={editingService}
        vehicles={vehicles}
        workshops={workshops}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Approval Dialog */}
      <Dialog open={showApproval} onOpenChange={setShowApproval}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Proses Persetujuan</DialogTitle>
            <DialogDescription>
              Service {approvalService?.nomorService} - {approvalService?.vehicle?.nomorPolisi}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-3 text-sm">
              <p><strong>Bengkel:</strong> {approvalService?.bengkel?.namaBengkel}</p>
              <p><strong>Jenis:</strong> {approvalService?.jenisService}</p>
              <p><strong>Total Biaya:</strong> {formatRupiah(approvalService?.totalBiaya || 0)}</p>
            </div>
            <div>
              <Label>Alasan Penolakan (jika menolak)</Label>
              <Textarea placeholder="Masukkan alasan penolakan..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejectReason.trim()) {
                  toast({ title: 'Peringatan', description: 'Alasan penolakan wajib diisi', variant: 'destructive' })
                  return
                }
                approveMutation.mutate({ id: approvalService!.id, action: 'reject', rejectedReason: rejectReason })
              }}
              disabled={approveMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" /> Tolak
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => approveMutation.mutate({ id: approvalService!.id, action: 'approve' })}
              disabled={approveMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Setujui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Dialog */}
      <ProgressDialog
        key={progressService?.id || 'new'}
        open={showProgress}
        onOpenChange={setShowProgress}
        service={progressService}
        onSubmit={(data) => progressMutation.mutate({ id: progressService!.id, ...data })}
        isSubmitting={progressMutation.isPending}
      />

      {/* Detail Sheet - Modernized */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto p-0">
          {detailLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-32 w-full" />
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : detail ? (
            <div className="flex flex-col">
              {/* Gradient Header Banner */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Detail Service</h2>
                      <p className="text-sm text-slate-300 font-mono">{detail.nomorService}</p>
                    </div>
                  </div>
                  <Badge className={cn('text-sm border px-3 py-1', STATUS_COLORS[detail.statusService as StatusService])}>
                    {STATUS_LABELS[detail.statusService as StatusService]}
                  </Badge>
                </div>
                {/* Progress bar with gradient */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-slate-300">Progress</span>
                    <span className="font-bold">{detail.progress}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                      style={{ width: detail.progress + '%' }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* General Info Card */}
                <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-slate-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="h-1 w-4 rounded-full bg-slate-700" />
                      Informasi Umum
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-start gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Tanggal Service</p>
                          <p className="font-semibold">{formatDate(detail.tanggalService)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Car className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Kendaraan</p>
                          <p className="font-semibold">{detail.vehicle?.nomorPolisi}</p>
                          <p className="text-xs text-muted-foreground">{detail.vehicle?.merk} {detail.vehicle?.type}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Wrench className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Bengkel</p>
                          <p className="font-semibold">{detail.bengkel?.namaBengkel}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Jenis / Prioritas</p>
                          <p className="font-semibold">{detail.jenisService} • {detail.prioritas}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Gauge className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Kilometer</p>
                          <p className="font-semibold">{detail.kilometerService?.toLocaleString('id-ID')} km</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Est. Lama Perbaikan</p>
                          <p className="font-semibold">{detail.estimasiLamaPerbaikan ? detail.estimasiLamaPerbaikan + ' hari' : '-'}</p>
                        </div>
                      </div>
                    </div>
                    {detail.keterangan && (
                      <div className="mt-3 p-2.5 rounded-lg bg-muted/50 text-sm">
                        <p className="text-xs text-muted-foreground mb-0.5">Keterangan</p>
                        <p>{detail.keterangan}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Items Table - Polished */}
                <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-slate-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="h-1 w-4 rounded-full bg-slate-700" />
                      Item Service
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detail.items && detail.items.length > 0 ? (
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-xs">Item</TableHead>
                              <TableHead className="text-xs text-center">Qty</TableHead>
                              <TableHead className="text-xs text-right">Harga</TableHead>
                              <TableHead className="text-xs text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detail.items.map((item: ServiceItem, idx: number) => (
                              <TableRow key={item.id} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                                <TableCell className="text-sm">
                                  {item.itemName}
                                  {item.keterangan && <p className="text-xs text-muted-foreground">{item.keterangan}</p>}
                                </TableCell>
                                <TableCell className="text-sm text-center">{item.quantity}</TableCell>
                                <TableCell className="text-sm text-right">{formatRupiah(item.hargaSatuan)}</TableCell>
                                <TableCell className="text-sm text-right font-medium">{formatRupiah(item.totalHarga)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {/* Total Summary */}
                        <div className="border-t p-3 bg-gradient-to-r from-slate-50 to-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-muted-foreground">Total</span>
                            <span className="text-lg font-bold">{formatRupiah(detail.totalBiaya)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Tidak ada item service</p>
                    )}
                  </CardContent>
                </Card>

                {/* Approval Info */}
                {(detail.approvedBy || detail.rejectedReason) && (
                  <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-slate-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="h-1 w-4 rounded-full bg-slate-700" />
                        Persetujuan
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {detail.approvedBy && (
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Disetujui oleh <strong>{detail.approvedBy}</strong></span>
                          {detail.approvedAt && <span className="text-muted-foreground">({formatDate(detail.approvedAt)})</span>}
                        </div>
                      )}
                      {detail.rejectedReason && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                          <strong>Alasan Ditolak:</strong> {detail.rejectedReason}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Catatan Bengkel */}
                {detail.catatanBengkel && (
                  <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-slate-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="h-1 w-4 rounded-full bg-slate-700" />
                        Catatan Bengkel
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm rounded-lg bg-muted/50 p-3">{detail.catatanBengkel}</p>
                    </CardContent>
                  </Card>
                )}

                {/* History - Timeline Style */}
                {detail.history && detail.history.length > 0 && (
                  <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-slate-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="h-1 w-4 rounded-full bg-slate-700" />
                        <History className="h-4 w-4" />
                        Riwayat
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative pl-6 max-h-48 overflow-y-auto">
                        {/* Timeline line */}
                        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200" />
                        <div className="space-y-4">
                          {detail.history.map((h: { id: string; status: string; keterangan: string | null; createdAt: string }, idx: number) => (
                            <div key={h.id} className="relative flex items-start gap-3">
                              <div className={'absolute -left-4 mt-1 h-3 w-3 rounded-full border-2 border-white ' + (idx === 0 ? 'bg-slate-700' : 'bg-slate-300') + ' z-10'} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{h.status}</Badge>
                                  <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                                </div>
                                <p className="text-muted-foreground text-xs mt-0.5">{h.keterangan}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Documents Section */}
                <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-slate-50/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="h-1 w-4 rounded-full bg-slate-700" />
                        <FileText className="h-4 w-4" />
                        Dokumen
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setShowUploadNota(true)}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload Nota
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {detail.documents && detail.documents.length > 0 ? (
                      <div className="space-y-2">
                        {detail.documents.map((doc: ServiceDocument) => {
                          const ext = doc.fileName.split('.').pop()?.toLowerCase() || ''
                          const extColors: Record<string, string> = {
                            pdf: 'bg-red-100 text-red-700',
                            doc: 'bg-blue-100 text-blue-700',
                            docx: 'bg-blue-100 text-blue-700',
                            xls: 'bg-emerald-100 text-emerald-700',
                            xlsx: 'bg-emerald-100 text-emerald-700',
                            jpg: 'bg-purple-100 text-purple-700',
                            jpeg: 'bg-purple-100 text-purple-700',
                            png: 'bg-purple-100 text-purple-700',
                          }
                          return (
                            <div key={doc.id} className="flex items-center gap-3 text-sm p-2.5 rounded-lg border hover:bg-muted/50 transition-colors">
                              <Badge variant="outline" className={'text-[10px] font-bold ' + (extColors[ext] || 'bg-gray-100 text-gray-700')}>
                                .{ext.toUpperCase()}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{doc.fileName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {doc.fileSize && (
                                    <span className="text-xs text-muted-foreground">
                                      {doc.fileSize < 1024 ? doc.fileSize + ' B' : doc.fileSize < 1024 * 1024 ? (doc.fileSize / 1024).toFixed(1) + ' KB' : (doc.fileSize / (1024 * 1024)).toFixed(1) + ' MB'}
                                    </span>
                                  )}
                                  {doc.jenisDokumen && (
                                    <Badge variant="secondary" className={cn(
                                      'text-[10px] px-1.5 py-0',
                                      doc.jenisDokumen === 'NOTA' && 'bg-blue-100 text-blue-800',
                                      doc.jenisDokumen === 'KWITANSI' && 'bg-green-100 text-green-800',
                                      doc.jenisDokumen === 'FAKTUR' && 'bg-orange-100 text-orange-800',
                                      doc.jenisDokumen === 'LAINNYA' && 'bg-gray-100 text-gray-800',
                                    )}>
                                      {doc.jenisDokumen}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Download">
                                  <a href={doc.filePath} download target="_blank" rel="noopener noreferrer">
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => deleteDocMutation.mutate({ serviceId: detail.id, docId: doc.id })}
                                  disabled={deleteDocMutation.isPending}
                                  title="Hapus"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2 opacity-30" />
                        <p className="text-sm">Belum ada dokumen</p>
                        <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => setShowUploadNota(true)}>
                          <Upload className="h-3.5 w-3.5" /> Upload Nota
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Upload Nota Dialog */}
      <Dialog open={showUploadNota} onOpenChange={setShowUploadNota}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Nota / Dokumen
            </DialogTitle>
            <DialogDescription>
              Upload nota, kwitansi, faktur, atau dokumen lainnya untuk service {detail?.nomorService}
            </DialogDescription>
          </DialogHeader>
          <MultiUpload
            onUpload={async (files, jenisDokumen) => {
              if (!detailService?.id) return
              await uploadNotaMutation.mutateAsync({
                serviceId: detailService.id,
                files,
                jenisDokumen,
              })
            }}
            isUploading={uploadNotaMutation.isPending}
            progress={uploadProgress}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========== Delete Button Component ==========
function DeleteButton({ serviceId, nomorService, onDelete, isDeleting }: { serviceId: string; nomorService: string; onDelete: () => void; isDeleting: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Hapus" disabled={isDeleting}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Service?</AlertDialogTitle>
          <AlertDialogDescription>
            Service <strong>{nomorService}</strong> akan dihapus. Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ========== Service Form Dialog ==========
interface ServiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingService: Service | null
  vehicles: { id: string; nomorPolisi: string; namaPengguna: string; merk: string; type: string; kilometerTerakhir: number }[]
  workshops: { id: string; namaBengkel: string }[]
  onSubmit: (data: ServiceFormData) => void
  isSubmitting: boolean
}

const serviceItemSchema = z.object({
  itemName: z.string().min(1, 'Nama item wajib diisi'),
  quantity: z.coerce.number().min(1, 'Qty min 1'),
  hargaSatuan: z.coerce.number().min(0, 'Harga min 0'),
  keterangan: z.string().optional().default(''),
})

const serviceFormSchema = z.object({
  tanggalService: z.string().min(1, 'Tanggal wajib diisi'),
  vehicleId: z.string().min(1, 'Kendaraan wajib dipilih'),
  bengkelId: z.string().min(1, 'Bengkel wajib dipilih'),
  jenisService: z.enum(['RUTIN', 'PERBAIKAN', 'DARURAT']),
  prioritas: z.enum(['RENDAH', 'NORMAL', 'TINGGI', 'DARURAT']),
  keterangan: z.string().optional().default(''),
  kilometerService: z.coerce.number().min(0).default(0),
  estimasiBiaya: z.coerce.number().min(0).default(0),
  estimasiLamaPerbaikan: z.coerce.number().min(0).optional().default(0),
  items: z.array(serviceItemSchema).optional().default([]),
})

function ServiceFormDialog({ open, onOpenChange, editingService, vehicles, workshops, onSubmit, isSubmitting }: ServiceFormDialogProps) {
  const [budgetValidation, setBudgetValidation] = useState<BudgetValidation | null>(null)
  const [isValidatingBudget, setIsValidatingBudget] = useState(false)
  const [vehicleSearch, setVehicleSearch] = useState('')

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema) as never,
    defaultValues: {
      tanggalService: new Date().toISOString().split('T')[0],
      vehicleId: '',
      bengkelId: '',
      jenisService: 'RUTIN',
      prioritas: 'NORMAL',
      keterangan: '',
      kilometerService: 0,
      estimasiBiaya: 0,
      estimasiLamaPerbaikan: 0,
      items: [{ itemName: '', quantity: 1, hargaSatuan: 0, keterangan: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })

  const watchedVehicleId = form.watch('vehicleId')
  const watchedItems = form.watch('items')

  // Calculate total from items
  const totalBiaya = useMemo(() => {
    return (watchedItems || []).reduce(
      (sum, item) => sum + ((item.quantity || 0) * (item.hargaSatuan || 0)),
      0
    )
  }, [watchedItems])

  // Populate form when editing
  useEffect(() => {
    if (editingService) {
      form.reset({
        tanggalService: editingService.tanggalService
          ? new Date(editingService.tanggalService).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        vehicleId: editingService.vehicleId,
        bengkelId: editingService.bengkelId,
        jenisService: editingService.jenisService as JenisService,
        prioritas: editingService.prioritas as Prioritas,
        keterangan: editingService.keterangan || '',
        kilometerService: editingService.kilometerService || 0,
        estimasiBiaya: editingService.estimasiBiaya || 0,
        estimasiLamaPerbaikan: editingService.estimasiLamaPerbaikan || 0,
        items:
          editingService.items && editingService.items.length > 0
            ? editingService.items.map((item) => ({
                itemName: item.itemName,
                quantity: item.quantity,
                hargaSatuan: item.hargaSatuan,
                keterangan: item.keterangan || '',
              }))
            : [{ itemName: '', quantity: 1, hargaSatuan: 0, keterangan: '' }],
      })
    } else {
      form.reset({
        tanggalService: new Date().toISOString().split('T')[0],
        vehicleId: '',
        bengkelId: '',
        jenisService: 'RUTIN',
        prioritas: 'NORMAL',
        keterangan: '',
        kilometerService: 0,
        estimasiBiaya: 0,
        estimasiLamaPerbaikan: 0,
        items: [{ itemName: '', quantity: 1, hargaSatuan: 0, keterangan: '' }],
      })
      setBudgetValidation(null)
    }
  }, [editingService, form])

  // Budget validation (debounced)
  useEffect(() => {
    if (!watchedVehicleId || totalBiaya <= 0) {
      if (!watchedVehicleId) setBudgetValidation(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsValidatingBudget(true)
      try {
        const res = await fetch('/api/anggaran/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicleId: watchedVehicleId, biaya: totalBiaya, serviceId: editingService?.id }),
        })
        if (res.ok) {
          const result = await res.json()
          setBudgetValidation(result.data)
        }
      } catch {
        setBudgetValidation(null)
      } finally {
        setIsValidatingBudget(false)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [watchedVehicleId, totalBiaya, editingService?.id])

  // Update vehicle kilometer when vehicle is selected
  useEffect(() => {
    if (watchedVehicleId) {
      const vehicle = vehicles.find((v) => v.id === watchedVehicleId)
      if (vehicle && !editingService) {
        form.setValue('kilometerService', vehicle.kilometerTerakhir)
      }
    }
  }, [watchedVehicleId, vehicles, editingService, form])

  const handleFormSubmit = (data: ServiceFormData) => {
    const processedItems = (data.items || []).map((item) => ({
      ...item,
      totalHarga: item.quantity * item.hargaSatuan,
    }))
    onSubmit({ ...data, items: processedItems, estimasiBiaya: totalBiaya })
  }

  const addItem = () => {
    append({ itemName: '', quantity: 1, hargaSatuan: 0, keterangan: '' })
  }

  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch) return vehicles
    const s = vehicleSearch.toLowerCase()
    return vehicles.filter(
      (v) => v.nomorPolisi.toLowerCase().includes(s) || v.namaPengguna.toLowerCase().includes(s) || v.merk.toLowerCase().includes(s)
    )
  }, [vehicles, vehicleSearch])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingService ? 'Edit Service' : 'Tambah Service Baru'}</DialogTitle>
          <DialogDescription>
            {editingService ? `Edit service ${editingService.nomorService}` : 'Isi form berikut untuk menambahkan service baru'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Informasi Dasar
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm">Tanggal Service *</Label>
                <Input type="date" className="mt-1" {...form.register('tanggalService')} />
                {form.formState.errors.tanggalService && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.tanggalService.message}</p>
                )}
              </div>
              <div>
                <Label className="text-sm">Kendaraan *</Label>
                <Select value={form.watch('vehicleId')} onValueChange={(v) => form.setValue('vehicleId', v)}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Pilih Kendaraan" /></SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input placeholder="Cari nopol..." value={vehicleSearch} onChange={(e) => setVehicleSearch(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <ScrollArea className="max-h-48">
                      {filteredVehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.nomorPolisi} - {v.merk} {v.type}</SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
                {form.formState.errors.vehicleId && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.vehicleId.message}</p>
                )}
              </div>
              <div>
                <Label className="text-sm">Bengkel *</Label>
                <Select value={form.watch('bengkelId')} onValueChange={(v) => form.setValue('bengkelId', v)}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Pilih Bengkel" /></SelectTrigger>
                  <SelectContent>
                    {workshops.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.namaBengkel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.bengkelId && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.bengkelId.message}</p>
                )}
              </div>
              <div>
                <Label className="text-sm">Jenis Service *</Label>
                <Select value={form.watch('jenisService')} onValueChange={(v) => form.setValue('jenisService', v as JenisService)}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JENIS_SERVICE_OPTIONS.map((j) => (<SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Prioritas</Label>
                <Select value={form.watch('prioritas')} onValueChange={(v) => form.setValue('prioritas', v as Prioritas)}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITAS_OPTIONS.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Kilometer Saat Service</Label>
                <Input type="number" className="mt-1" {...form.register('kilometerService', { valueAsNumber: true })} />
              </div>
              <div>
                <Label className="text-sm">Estimasi Lama Perbaikan (Hari)</Label>
                <Input type="number" className="mt-1" {...form.register('estimasiLamaPerbaikan', { valueAsNumber: true })} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm">Keterangan</Label>
                <Textarea className="mt-1" placeholder="Keterangan tambahan..." {...form.register('keterangan')} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Spreadsheet-Style Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" /> Item Service
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="h-3 w-3" /> Tambah Item
              </Button>
            </div>

            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs w-8">#</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs min-w-[200px]">Nama Item *</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground text-xs w-20">Qty *</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs w-36">Harga Satuan *</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs w-36">Total</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs min-w-[150px]">Keterangan</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const qty = form.watch(`items.${index}.quantity`) || 0
                    const harga = form.watch(`items.${index}.hargaSatuan`) || 0
                    const rowTotal = qty * harga

                    return (
                      <tr key={field.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-1.5 text-muted-foreground text-xs">{index + 1}</td>
                        <td className="px-1 py-1.5">
                          <Input
                            placeholder="Nama item/suku cadang"
                            className="h-8 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent"
                            {...form.register(`items.${index}.itemName`)}
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <Input
                            type="number" min={1}
                            className="h-8 text-sm text-center border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent w-full"
                            {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <Input
                            type="number" min={0}
                            className="h-8 text-sm text-right border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent"
                            {...form.register(`items.${index}.hargaSatuan`, { valueAsNumber: true })}
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium text-sm">{formatRupiah(rowTotal)}</td>
                        <td className="px-1 py-1.5">
                          <Input
                            placeholder="Catatan"
                            className="h-8 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent"
                            {...form.register(`items.${index}.keterangan`)}
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          {fields.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(index)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 border-t">
                    <td colSpan={4} className="px-3 py-2 text-right font-semibold text-sm">Total Biaya:</td>
                    <td className="px-3 py-2 text-right font-bold text-sm text-primary">{formatRupiah(totalBiaya)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <Separator />

          {/* Budget Validation Panel */}
          {watchedVehicleId && totalBiaya > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Validasi Anggaran
              </h3>

              {isValidatingBudget ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Memvalidasi anggaran...
                </div>
              ) : budgetValidation ? (
                <>
                  {(budgetValidation.level === 'CRITICAL' || budgetValidation.level === 'ERROR') && (
                    <div className={cn('rounded-lg border-2 p-4 flex items-start gap-3', BUDGET_LEVEL_COLORS[budgetValidation.level])}>
                      {BUDGET_LEVEL_ICONS[budgetValidation.level]}
                      <div>
                        <p className="font-semibold text-sm">
                          {budgetValidation.level === 'CRITICAL' ? 'PERINGATAN KRITIS!' : 'ANGGARAN TIDAK MENCUKUPI!'}
                        </p>
                        <p className="text-sm mt-1">{budgetValidation.message}</p>
                      </div>
                    </div>
                  )}

                  <div className={cn(
                    'rounded-lg border p-4',
                    budgetValidation.level === 'INFO' && 'border-blue-200 bg-blue-50/50',
                    budgetValidation.level === 'WARNING' && 'border-yellow-200 bg-yellow-50/50',
                    budgetValidation.level === 'CRITICAL' && 'border-fuchsia-200 bg-fuchsia-50/30',
                    budgetValidation.level === 'ERROR' && 'border-red-200 bg-red-50/30',
                  )}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Anggaran Total</span>
                        <p className="font-semibold">{formatRupiah(budgetValidation.anggaranTotal)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Terpakai</span>
                        <p className="font-semibold">{formatRupiah(budgetValidation.anggaranTerpakai)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Prediksi Setelah Service</span>
                        <p className="font-semibold">{formatRupiah(budgetValidation.prediksiSetelahService)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Sisa Anggaran</span>
                        <p className={cn('font-semibold', budgetValidation.sisaAnggaran < 0 ? 'text-red-600' : 'text-green-600')}>
                          {formatRupiah(budgetValidation.sisaAnggaran)}
                        </p>
                      </div>
                    </div>

                    {budgetValidation.kekuranganDana > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-xs text-destructive font-medium">
                          Kekurangan Dana: {formatRupiah(budgetValidation.kekuranganDana)}
                        </span>
                      </div>
                    )}

                    {budgetValidation.anggaranTotal > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Penggunaan Anggaran</span>
                          <span className="font-medium">{((budgetValidation.prediksiSetelahService / budgetValidation.anggaranTotal) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              budgetValidation.level === 'INFO' && 'bg-blue-500',
                              budgetValidation.level === 'WARNING' && 'bg-yellow-500',
                              budgetValidation.level === 'CRITICAL' && 'bg-fuchsia-500',
                              budgetValidation.level === 'ERROR' && 'bg-red-500',
                            )}
                            style={{ width: `${Math.min(100, (budgetValidation.prediksiSetelahService / budgetValidation.anggaranTotal) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Submit Footer */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || (budgetValidation?.canSave === false)} className="gap-2">
              {isSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />}
              {editingService ? 'Update Service' : 'Simpan Service'}
            </Button>
          </DialogFooter>

          {budgetValidation?.canSave === false && (
            <p className="text-xs text-destructive text-right">Tidak dapat menyimpan - anggaran tidak mencukupi!</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ========== Progress Update Dialog ==========
interface ProgressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service | null
  onSubmit: (data: { progress: number; statusService?: string; catatanBengkel?: string }) => void
  isSubmitting: boolean
}

function ProgressDialog({ open, onOpenChange, service, onSubmit, isSubmitting }: ProgressDialogProps) {
  const [progress, setProgress] = useState(service?.progress || 0)
  const [statusService, setStatusService] = useState<string>(service?.statusService === 'DISETUJUI' ? 'DIPROSES' : (service?.statusService || 'DIPROSES'))
  const [catatanBengkel, setCatatanBengkel] = useState(service?.catatanBengkel || '')

  const handleSave = () => {
    onSubmit({ progress, statusService, catatanBengkel })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Progress</DialogTitle>
          <DialogDescription>Service {service?.nomorService} - {service?.vehicle?.nomorPolisi}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Progress: {progress}%</Label>
            <Slider value={[progress]} onValueChange={(v) => setProgress(v[0])} max={100} step={5} className="w-full" />
            <Progress value={progress} className="h-2" />
          </div>
          <div>
            <Label>Status Service</Label>
            <Select value={statusService} onValueChange={setStatusService}>
              <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DIPROSES">Diproses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SELESAI">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Catatan Bengkel</Label>
            <Textarea className="mt-1" placeholder="Catatan dari bengkel..." value={catatanBengkel} onChange={(e) => setCatatanBengkel(e.target.value)} />
          </div>
          {progress === 100 && (
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              Progress 100% - Status akan otomatis diubah menjadi <strong>SELESAI</strong> dan tanggal selesai akan dicatat.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Batal</Button>
          <Button onClick={handleSave} disabled={isSubmitting} className="gap-2">
            {isSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ServicePage
