import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { format, filters } = body

    // Fetch data with same filters as GET
    const where: any = { isDeleted: false }
    const { type, year, month, dateFrom, dateTo, vehicleId, bengkelId, jenisKendaraan, statusService, jenisService } = filters || {}

    const yearNum = parseInt(year || new Date().getFullYear().toString())
    if (type === 'tahunan') {
      where.tanggalService = { gte: new Date(yearNum, 0, 1), lte: new Date(yearNum, 11, 31) }
    } else if (type === 'bulanan' && month) {
      const m = parseInt(month) - 1
      where.tanggalService = { gte: new Date(yearNum, m, 1), lte: new Date(yearNum, m + 1, 0) }
    } else if (type === 'custom' && dateFrom && dateTo) {
      where.tanggalService = { gte: new Date(dateFrom), lte: new Date(dateTo) }
    }

    if (vehicleId) where.vehicleId = vehicleId
    if (bengkelId) where.bengkelId = bengkelId
    if (statusService) where.statusService = statusService
    if (jenisService) where.jenisService = jenisService
    if (jenisKendaraan) where.vehicle = { jenisKendaraan }

    const services = await db.service.findMany({
      where,
      include: { vehicle: true, bengkel: true, items: true },
      orderBy: { tanggalService: 'desc' },
    })

    if (format === 'excel' || format === 'csv') {
      // Generate CSV
      const headers = ['No', 'Nomor Service', 'Tanggal', 'Nomor Polisi', 'Merk/Type', 'Jenis Service', 'Bengkel', 'Kilometer', 'Estimasi Biaya', 'Total Biaya', 'Status']
      const rows = services.map((s, i) => [
        i + 1,
        s.nomorService,
        new Date(s.tanggalService).toLocaleDateString('id-ID'),
        s.vehicle.nomorPolisi,
        `${s.vehicle.merk} ${s.vehicle.type}`,
        s.jenisService,
        s.bengkel.namaBengkel,
        s.kilometerService,
        s.estimasiBiaya,
        s.totalBiaya,
        s.statusService,
      ])

      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
      const BOM = '\uFEFF'
      const buffer = Buffer.from(BOM + csvContent, 'utf-8')

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=laporan-service-${year || 'all'}.csv`,
        },
      })
    }

    if (format === 'pdf') {
      // Generate HTML for PDF
      const totalBiaya = services.reduce((sum, s) => sum + s.totalBiaya, 0)
      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Laporan Service Kendaraan</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #333; }
  .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 10px; margin-bottom: 15px; }
  .header h2 { margin: 0; font-size: 14px; }
  .header h3 { margin: 5px 0 0; font-size: 12px; }
  .header p { margin: 3px 0 0; font-size: 10px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; }
  th { background: #f5f5f5; font-weight: bold; font-size: 10px; }
  td { font-size: 10px; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .summary { margin: 15px 0; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .summary-item { padding: 8px; background: #f9f9f9; border: 1px solid #eee; }
  .summary-item .label { font-size: 9px; color: #666; }
  .summary-item .value { font-size: 13px; font-weight: bold; }
  .footer { margin-top: 30px; text-align: right; }
  .signature { display: inline-block; text-align: center; margin-left: 50px; }
  .signature-line { width: 200px; border-bottom: 1px solid #333; margin: 60px auto 5px; }
  .qr-placeholder { width: 80px; height: 80px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #999; margin-top: 10px; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <div class="header">
    <h2>PEMERINTAH DAERAH</h2>
    <h3>BADAN KEUANGAN DAN ASET DAERAH</h3>
    <p>Laporan Service Kendaraan Operasional Dinas</p>
    <p>Tahun ${year || new Date().getFullYear()} | ${type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Tahunan'}</p>
  </div>
  
  <div class="summary">
    <div class="summary-grid">
      <div class="summary-item">
        <div class="label">Total Service</div>
        <div class="value">${services.length}</div>
      </div>
      <div class="summary-item">
        <div class="label">Total Biaya</div>
        <div class="value">Rp ${totalBiaya.toLocaleString('id-ID')}</div>
      </div>
      <div class="summary-item">
        <div class="label">Service Selesai</div>
        <div class="value">${services.filter(s => s.statusService === 'SELESAI').length}</div>
      </div>
      <div class="summary-item">
        <div class="label">Service Aktif</div>
        <div class="value">${services.filter(s => s.statusService !== 'SELESAI' && s.statusService !== 'DITOLAK').length}</div>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="text-center">No</th>
        <th>Nomor Service</th>
        <th>Tanggal</th>
        <th>Nomor Polisi</th>
        <th>Kendaraan</th>
        <th>Jenis</th>
        <th>Bengkel</th>
        <th class="text-right">Biaya</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${services.map((s, i) => `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td>${s.nomorService}</td>
        <td>${new Date(s.tanggalService).toLocaleDateString('id-ID')}</td>
        <td>${s.vehicle.nomorPolisi}</td>
        <td>${s.vehicle.merk} ${s.vehicle.type}</td>
        <td>${s.jenisService}</td>
        <td>${s.bengkel.namaBengkel}</td>
        <td class="text-right">Rp ${s.totalBiaya.toLocaleString('id-ID')}</td>
        <td>${s.statusService}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <div class="qr-placeholder">QR Code</div>
    <p style="font-size: 9px; color: #999;">Dokumen ini divalidasi secara digital</p>
    <br><br>
    <p>Dicetak pada: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    
    <div class="signature">
      <div class="signature-line"></div>
      <p>Kepala BKAD</p>
    </div>
  </div>
</body>
</html>`

      const buffer = Buffer.from(html, 'utf-8')
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename=laporan-service-${year || 'all'}.html`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Error exporting report:', error)
    return NextResponse.json({ error: 'Failed to export report' }, { status: 500 })
  }
}
