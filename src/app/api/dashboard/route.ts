import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tahun = parseInt(searchParams.get('tahun') || new Date().getFullYear().toString())
    const bulan = searchParams.get('bulan') || ''
    const jenisKendaraan = searchParams.get('jenisKendaraan') || ''

    // Base vehicle filter
    const vehicleWhere: Record<string, unknown> = { isActive: true }
    if (jenisKendaraan) vehicleWhere.jenisKendaraan = jenisKendaraan

    // Base service filter
    const serviceWhere: Record<string, unknown> = { isDeleted: false }
    if (jenisKendaraan) {
      serviceWhere.vehicle = { jenisKendaraan }
    }
    if (bulan) {
      const monthInt = parseInt(bulan)
      const startDate = new Date(tahun, monthInt - 1, 1)
      const endDate = new Date(tahun, monthInt, 1)
      serviceWhere.tanggalService = { gte: startDate, lt: endDate }
    }

    // Fetch data in parallel
    const [vehicles, services, workshops, budgets, notifications] = await Promise.all([
      db.vehicle.findMany({ where: vehicleWhere }),
      db.service.findMany({
        where: serviceWhere,
        include: { vehicle: true, bengkel: true, items: true, history: true },
      }),
      db.workshop.findMany({ where: { statusAktif: true } }),
      db.budget.findMany({ where: { tahun } }),
      db.notification.findMany({
        where: { isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    // Vehicle stats
    const totalKendaraanRoda2 = vehicles.filter(v => v.jenisKendaraan === 'RODA_2').length
    const totalKendaraanRoda4 = vehicles.filter(v => v.jenisKendaraan === 'RODA_4').length

    // Service stats
    const kendaraanAktifService = services.filter(s =>
      ['DIAJUKAN', 'DISETUJUI', 'DIPROSES'].includes(s.statusService)
    ).length
    const kendaraanSelesaiService = services.filter(s => s.statusService === 'SELESAI').length

    // Budget stats
    const totalAnggaran = budgets.reduce((s, b) => s + b.totalAnggaran, 0)
    const totalAnggaranTerpakai = budgets.reduce((s, b) => s + b.realisasi, 0)
    const sisaAnggaran = totalAnggaran - totalAnggaranTerpakai

    // Monthly spending chart (last 12 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
    const pengeluaranBulanan = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(tahun, new Date().getMonth() - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()
      const monthServices = services.filter(s => {
        const sd = new Date(s.tanggalService)
        return sd.getMonth() === m && sd.getFullYear() === y && s.statusService === 'SELESAI'
      })
      const total = monthServices.reduce((sum, s) => sum + s.totalBiaya, 0)
      pengeluaranBulanan.push({ bulan: `${monthNames[m]} ${y}`, total })
    }

    // Most serviced vehicles (top 5)
    const vehicleServiceCount: Record<string, { nomorPolisi: string; merk: string; total: number }> = {}
    services.forEach(s => {
      const vid = s.vehicleId
      if (!vehicleServiceCount[vid]) {
        vehicleServiceCount[vid] = {
          nomorPolisi: s.vehicle?.nomorPolisi || '-',
          merk: s.vehicle?.merk || '-',
          total: 0,
        }
      }
      vehicleServiceCount[vid].total++
    })
    const kendaraanSeringService = Object.values(vehicleServiceCount)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    // Workshop stats
    const statistikBengkel = workshops.map(w => {
      const count = services.filter(s => s.bengkelId === w.id).length
      return { nama: w.namaBengkel, total: count }
    }).sort((a, b) => b.total - a.total)

    // Over budget alerts
    const alertOverBudget = budgets
      .filter(b => b.realisasi > b.totalAnggaran * 0.7)
      .map(b => {
        const vehicle = vehicles.find(v => v.id === b.vehicleId)
        return {
          nomorPolisi: vehicle?.nomorPolisi || '-',
          total: b.realisasi,
          anggaran: b.totalAnggaran,
          persen: Math.round((b.realisasi / b.totalAnggaran) * 100),
        }
      })

    // Late service alerts
    const alertTerlambat = services
      .filter(s => {
        if (s.statusService === 'SELESAI' || !s.estimasiLamaPerbaikan) return false
        const estDate = new Date(s.tanggalService)
        estDate.setDate(estDate.getDate() + s.estimasiLamaPerbaikan)
        return new Date() > estDate
      })
      .map(s => ({
        nomorPolisi: s.vehicle?.nomorPolisi || '-',
        estimasi: s.estimasiLamaPerbaikan ? `${s.estimasiLamaPerbaikan} hari` : '-',
        hariTerlambat: Math.ceil((new Date().getTime() - new Date(s.tanggalService).getTime()) / (1000 * 60 * 60 * 24)),
      }))

    // In-progress services
    const progressPerbaikan = services
      .filter(s => ['DIPROSES', 'DISETUJUI'].includes(s.statusService))
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        nomorService: s.nomorService,
        nomorPolisi: s.vehicle?.nomorPolisi || '-',
        merk: s.vehicle?.merk || '-',
        bengkel: s.bengkel?.namaBengkel || '-',
        progress: s.progress,
        statusService: s.statusService,
        tanggalService: s.tanggalService,
        estimasiLamaPerbaikan: s.estimasiLamaPerbaikan,
      }))

    return NextResponse.json({
      totalKendaraanRoda2,
      totalKendaraanRoda4,
      kendaraanAktifService,
      kendaraanSelesaiService,
      totalAnggaranTahun: totalAnggaran,
      totalAnggaranTerpakai,
      sisaAnggaran,
      pengeluaranBulanan,
      kendaraanSeringService,
      statistikBengkel,
      notifikasiTerbaru: notifications,
      alertOverBudget,
      alertTerlambat,
      progressPerbaikan,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
