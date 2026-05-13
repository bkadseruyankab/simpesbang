'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Settings, Building2, Mail, Users, FileText, Database, Calendar, Save, Plus, Trash2, Edit, Download, Upload, Shield, Clock, User, ActionIcon } from 'lucide-react'
import { toast } from 'sonner'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  BENGKEL: 'Bengkel',
  PIMPINAN: 'Pimpinan',
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  SUPER_ADMIN: 'Akses penuh ke seluruh sistem',
  ADMIN: 'Mengelola service, kendaraan, dan laporan',
  BENGKEL: 'Mengelola progress service di bengkel',
  PIMPINAN: 'Melihat laporan dan menyetujui service',
}

export function PengaturanPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('umum')
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'ADMIN', bengkelId: '' })

  // Fetch settings
  const { data: settings = {}, isLoading: loadingSettings } = useQuery({
    queryKey: ['pengaturan'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan')
      return res.json()
    },
  })

  // Fetch users
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['pengaturan-users'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan/users')
      return res.json()
    },
  })

  // Fetch workshops for user form
  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops-pengaturan'],
    queryFn: async () => {
      const res = await fetch('/api/bengkel')
      return res.json()
    },
  })

  // Fetch audit logs
  const { data: auditData, isLoading: loadingAudit } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan/audit-logs')
      return res.json()
    },
  })

  // Fetch backup info
  const { data: backupInfo, isLoading: loadingBackup } = useQuery({
    queryKey: ['backup-info'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan/backup')
      return res.json()
    },
  })

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (newSettings: Record<string, string>) => {
      const res = await fetch('/api/pengaturan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengaturan'] })
      toast.success('Pengaturan berhasil disimpan')
    },
    onError: () => {
      toast.error('Gagal menyimpan pengaturan')
    },
  })

  // Create user mutation
  const createUser = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/pengaturan/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal membuat user')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengaturan-users'] })
      toast.success('User berhasil ditambahkan')
      setUserDialogOpen(false)
      setUserForm({ name: '', email: '', password: '', role: 'ADMIN', bengkelId: '' })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Backup mutation
  const handleBackup = async () => {
    try {
      toast.loading('Membuat backup...', { id: 'backup' })
      const res = await fetch('/api/pengaturan/backup', { method: 'POST' })
      if (!res.ok) throw new Error('Backup failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const contentDisp = res.headers.get('Content-Disposition')
      a.download = contentDisp ? contentDisp.split('filename=')[1]?.replace(/"/g, '') : 'bkad-backup.db'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Backup berhasil diunduh', { id: 'backup' })
      queryClient.invalidateQueries({ queryKey: ['backup-info'] })
    } catch {
      toast.error('Gagal membuat backup', { id: 'backup' })
    }
  }

  const [localSettings, setLocalSettings] = useState<Record<string, string>>({})

  // Sync settings when loaded
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  if (!settingsLoaded && Object.keys(settings).length > 0) {
    setLocalSettings({ ...settings })
    setSettingsLoaded(true)
  }

  const handleSaveSettings = (section: string) => {
    const sectionKeys: Record<string, string[]> = {
      umum: ['nama_instansi', 'tahun_aktif', 'nomor_surat_otomatis', 'format_nomor_surat'],
      email: ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'smtp_from_email', 'whatsapp_api_key', 'whatsapp_api_url',
        'notif_service_diajukan', 'notif_service_disetujui', 'notif_service_ditolak', 'notif_service_selesai', 'notif_anggaran_warning'],
    }
    const keys = sectionKeys[section] || []
    const updateData: Record<string, string> = {}
    keys.forEach(k => {
      if (localSettings[k] !== undefined) updateData[k] = localSettings[k]
    })
    updateSettings.mutate(updateData)
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (loadingSettings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Pengaturan Sistem
        </h1>
        <p className="text-muted-foreground">Konfigurasi dan manajemen sistem</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="umum" className="text-xs">Umum</TabsTrigger>
          <TabsTrigger value="email" className="text-xs">Email & Notifikasi</TabsTrigger>
          <TabsTrigger value="users" className="text-xs">Manajemen User</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">Audit Log</TabsTrigger>
          <TabsTrigger value="backup" className="text-xs">Backup & Restore</TabsTrigger>
          <TabsTrigger value="tahun" className="text-xs">Pergantian Tahun</TabsTrigger>
        </TabsList>

        {/* Tab: Umum */}
        <TabsContent value="umum" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Pengaturan Umum</CardTitle>
              <CardDescription>Konfigurasi dasar sistem</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nama_instansi">Nama Instansi</Label>
                  <Input
                    id="nama_instansi"
                    value={localSettings.nama_instansi || ''}
                    onChange={(e) => setLocalSettings(s => ({ ...s, nama_instansi: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tahun_aktif">Tahun Aktif</Label>
                  <Select value={localSettings.tahun_aktif || '2025'} onValueChange={(v) => setLocalSettings(s => ({ ...s, tahun_aktif: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2023, 2024, 2025, 2026, 2027].map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Nomor Surat Otomatis</Label>
                  <p className="text-xs text-muted-foreground">Generate nomor service secara otomatis</p>
                </div>
                <Switch
                  checked={localSettings.nomor_surat_otomatis === 'true'}
                  onCheckedChange={(checked) => setLocalSettings(s => ({ ...s, nomor_surat_otomatis: checked.toString() }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="format_nomor_surat">Format Nomor Surat</Label>
                <Input
                  id="format_nomor_surat"
                  value={localSettings.format_nomor_surat || ''}
                  onChange={(e) => setLocalSettings(s => ({ ...s, format_nomor_surat: e.target.value }))}
                  placeholder="SRV/{tahun}/{nomor}"
                />
                <p className="text-xs text-muted-foreground">Gunakan {'{tahun}'} dan {'{nomor}'} sebagai placeholder</p>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSaveSettings('umum')} disabled={updateSettings.isPending}>
                  <Save className="h-4 w-4 mr-1" /> Simpan Pengaturan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Email & Notifikasi */}
        <TabsContent value="email" className="mt-4">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Konfigurasi Email (SMTP)</CardTitle>
                <CardDescription>Pengaturan server email untuk notifikasi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input
                      value={localSettings.smtp_host || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, smtp_host: e.target.value }))}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input
                      value={localSettings.smtp_port || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, smtp_port: e.target.value }))}
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={localSettings.smtp_username || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, smtp_username: e.target.value }))}
                      placeholder="email@domain.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={localSettings.smtp_password || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, smtp_password: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>From Email</Label>
                    <Input
                      value={localSettings.smtp_from_email || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, smtp_from_email: e.target.value }))}
                      placeholder="noreply@bkad.go.id"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                  WhatsApp API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={localSettings.whatsapp_api_key || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, whatsapp_api_key: e.target.value }))}
                      placeholder="Masukkan API key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API URL</Label>
                    <Input
                      value={localSettings.whatsapp_api_url || ''}
                      onChange={(e) => setLocalSettings(s => ({ ...s, whatsapp_api_url: e.target.value }))}
                      placeholder="https://api.whatsapp.com/v1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notifikasi per Event</CardTitle>
                <CardDescription>Aktifkan notifikasi untuk setiap jenis event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'notif_service_diajukan', label: 'Service Diajukan', desc: 'Notifikasi saat service baru diajukan' },
                  { key: 'notif_service_disetujui', label: 'Service Disetujui', desc: 'Notifikasi saat service disetujui admin' },
                  { key: 'notif_service_ditolak', label: 'Service Ditolak', desc: 'Notifikasi saat service ditolak' },
                  { key: 'notif_service_selesai', label: 'Service Selesai', desc: 'Notifikasi saat service selesai dikerjakan' },
                  { key: 'notif_anggaran_warning', label: 'Peringatan Anggaran', desc: 'Notifikasi saat anggaran mendekati batas' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={localSettings[item.key] === 'true'}
                      onCheckedChange={(checked) => setLocalSettings(s => ({ ...s, [item.key]: checked.toString() }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => handleSaveSettings('email')} disabled={updateSettings.isPending}>
                <Save className="h-4 w-4 mr-1" /> Simpan Pengaturan
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Manajemen User */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Manajemen User</CardTitle>
                <CardDescription>Kelola pengguna sistem</CardDescription>
              </div>
              <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => { setEditingUser(null); setUserForm({ name: '', email: '', password: '', role: 'ADMIN', bengkelId: '' }) }}>
                    <Plus className="h-4 w-4 mr-1" /> Tambah User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingUser ? 'Edit User' : 'Tambah User Baru'}</DialogTitle>
                    <DialogDescription>Masukkan data pengguna sistem</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nama</Label>
                      <Input value={userForm.name} onChange={(e) => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama lengkap" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={userForm.email} onChange={(e) => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="email@domain.com" type="email" />
                    </div>
                    {!editingUser && (
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input value={userForm.password} onChange={(e) => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimal 8 karakter" type="password" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={userForm.role} onValueChange={(v) => setUserForm(f => ({ ...f, role: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              <div>
                                <p>{label}</p>
                                <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[key]}</p>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {userForm.role === 'BENGKEL' && (
                      <div className="space-y-2">
                        <Label>Bengkel</Label>
                        <Select value={userForm.bengkelId} onValueChange={(v) => setUserForm(f => ({ ...f, bengkelId: v }))}>
                          <SelectTrigger><SelectValue placeholder="Pilih bengkel" /></SelectTrigger>
                          <SelectContent>
                            {workshops.map((w: any) => (
                              <SelectItem key={w.id} value={w.id}>{w.namaBengkel}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Batal</Button>
                    <Button onClick={() => createUser.mutate(userForm)} disabled={createUser.isPending}>
                      {editingUser ? 'Simpan' : 'Tambah'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Bengkel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-sm">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{ROLE_LABELS[user.role] || user.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{user.bengkel?.namaBengkel || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'destructive'} className="text-xs">
                            {user.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Yakin ingin menghapus user &quot;{user.name}&quot;? Tindakan ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90">Hapus</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Role Descriptions */}
              <Separator className="my-4" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-start gap-2 rounded-lg border p-3">
                    <Shield className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[key]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Audit Log */}
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Audit Log</CardTitle>
              <CardDescription>Riwayat aktivitas sistem</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAudit ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Aksi</TableHead>
                        <TableHead>Entitas</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(auditData?.logs || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Belum ada log aktivitas
                          </TableCell>
                        </TableRow>
                      ) : (
                        (auditData?.logs || []).map((log: any) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {formatDate(log.createdAt)}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-1.5">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                                  <User className="h-3 w-3" />
                                </div>
                                <span>{log.user?.name || 'System'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                log.action === 'CREATE' ? 'default' :
                                log.action === 'UPDATE' ? 'secondary' :
                                log.action === 'DELETE' ? 'destructive' :
                                'outline'
                              } className="text-[10px]">
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{log.entity}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.details}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Backup & Restore */}
        <TabsContent value="backup" className="mt-4">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Backup Database</CardTitle>
                <CardDescription>Unduh cadangan database sistem</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingBackup ? (
                  <Skeleton className="h-20" />
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Ukuran Database</p>
                        <p className="text-lg font-bold">{backupInfo?.stats?.dbSizeFormatted || 'N/A'}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Total User</p>
                        <p className="text-lg font-bold">{backupInfo?.stats?.users || 0}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Total Kendaraan</p>
                        <p className="text-lg font-bold">{backupInfo?.stats?.vehicles || 0}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Total Service</p>
                        <p className="text-lg font-bold">{backupInfo?.stats?.services || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="text-sm font-medium">Backup Terakhir</p>
                        <p className="text-xs text-muted-foreground">
                          {backupInfo?.lastBackup
                            ? formatDate(backupInfo.lastBackup)
                            : 'Belum pernah dibackup'}
                        </p>
                      </div>
                      <Button onClick={handleBackup}>
                        <Download className="h-4 w-4 mr-1" /> Backup Sekarang
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Restore Database</CardTitle>
                <CardDescription>Pulihkan database dari file backup</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <div>
                    <p className="text-sm font-medium text-destructive">Peringatan</p>
                    <p className="text-xs text-muted-foreground">Restore akan menimpa seluruh data yang ada. Pastikan Anda sudah membuat backup sebelum melakukan restore.</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Upload className="h-4 w-4 mr-1" /> Restore
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Restore Database</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tindakan ini akan menimpa seluruh database yang ada. Data yang sudah ada akan hilang dan diganti dengan data dari file backup. Tindakan ini TIDAK DAPAT dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-2">
                        <Label>Pilih File Backup (.db)</Label>
                        <Input type="file" accept=".db" />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90">
                          Restore Database
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Pergantian Tahun */}
        <TabsContent value="tahun" className="mt-4">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Pergantian Tahun Anggaran</CardTitle>
                <CardDescription>Kelola pergantian tahun dan inisialisasi anggaran baru</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border bg-primary/5 p-4">
                  <div>
                    <p className="text-sm font-medium">Tahun Aktif Saat Ini</p>
                    <p className="text-3xl font-bold text-primary">{localSettings.tahun_aktif || new Date().getFullYear()}</p>
                  </div>
                  <Badge variant="outline" className="text-sm">Aktif</Badge>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">Generate Tahun Baru</h3>
                    <p className="text-xs text-muted-foreground">Buat anggaran dan data untuk tahun baru berdasarkan data tahun sebelumnya</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Switch id="copy-budget" defaultChecked />
                        <Label htmlFor="copy-budget" className="text-sm">Salin Anggaran</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">Salin total anggaran dari tahun sebelumnya ke tahun baru</p>
                    </div>
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Switch id="reset-stats" />
                        <Label htmlFor="reset-stats" className="text-sm">Reset Statistik</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">Reset realisasi anggaran menjadi 0 untuk tahun baru</p>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full" variant="outline">
                        <Calendar className="h-4 w-4 mr-1" /> Generate Tahun {parseInt(localSettings.tahun_aktif || '2025') + 1}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Generate Tahun Baru</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tindakan ini akan membuat data anggaran baru untuk tahun {parseInt(localSettings.tahun_aktif || '2025') + 1}.
                          Tahun aktif akan diubah menjadi {parseInt(localSettings.tahun_aktif || '2025') + 1}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction>Generate</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informasi Tahun {localSettings.tahun_aktif || new Date().getFullYear()}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Kendaraan Terdaftar</p>
                    <p className="text-2xl font-bold">{backupInfo?.stats?.vehicles || 0}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Service Dilakukan</p>
                    <p className="text-2xl font-bold">{backupInfo?.stats?.services || 0}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Bengkel Aktif</p>
                    <p className="text-2xl font-bold">{backupInfo?.stats?.workshops || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
