import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/service/[id]/approve - Approve or reject service
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { action, rejectedReason, approvedBy } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action harus approve atau reject' }, { status: 400 })
    }

    const service = await db.service.findUnique({ where: { id } })
    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    if (service.statusService !== 'DIAJUKAN') {
      return NextResponse.json(
        { error: 'Hanya service dengan status DIAJUKAN yang dapat diproses' },
        { status: 400 }
      )
    }

    let newStatus: string
    let historyKeterangan: string

    if (action === 'approve') {
      newStatus = 'DISETUJUI'
      historyKeterangan = 'Service disetujui'
    } else {
      if (!rejectedReason) {
        return NextResponse.json(
          { error: 'Alasan penolakan wajib diisi' },
          { status: 400 }
        )
      }
      newStatus = 'DITOLAK'
      historyKeterangan = `Service ditolak: ${rejectedReason}`
    }

    const updatedService = await db.service.update({
      where: { id },
      data: {
        statusService: newStatus,
        approvedBy: action === 'approve' ? (approvedBy || 'admin') : null,
        approvedAt: action === 'approve' ? new Date() : null,
        rejectedReason: action === 'reject' ? rejectedReason : null,
        ...(action === 'approve' ? { progress: 0 } : {}),
      },
      include: {
        vehicle: true,
        bengkel: true,
        items: true,
      },
    })

    await db.serviceHistory.create({
      data: {
        serviceId: id,
        vehicleId: service.vehicleId,
        status: newStatus,
        keterangan: historyKeterangan,
      },
    })

    return NextResponse.json({ data: updatedService })
  } catch (error) {
    console.error('Error approving/rejecting service:', error)
    return NextResponse.json({ error: 'Gagal memproses persetujuan' }, { status: 500 })
  }
}
