import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

// PUT /api/service/[id]/progress - Update service progress
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { progress, statusService, catatanBengkel } = body

    const service = await db.service.findUnique({ where: { id } })
    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    if (!['DISETUJUI', 'DIPROSES', 'PENDING'].includes(service.statusService)) {
      return NextResponse.json(
        { error: 'Progress hanya dapat diupdate untuk service DISETUJUI, DIPROSES, atau PENDING' },
        { status: 400 }
      )
    }

    const progressValue = Math.min(100, Math.max(0, progress || 0))

    let newStatus = statusService || service.statusService
    if (progressValue === 100) {
      newStatus = 'SELESAI'
    } else if (progressValue > 0 && newStatus === 'DISETUJUI') {
      newStatus = 'DIPROSES'
    }

    const updatedService = await db.service.update({
      where: { id },
      data: {
        progress: progressValue,
        statusService: newStatus,
        catatanBengkel: catatanBengkel !== undefined ? catatanBengkel : undefined,
        tanggalSelesai: progressValue === 100 ? new Date() : null,
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
        keterangan: `Progress diupdate ke ${progressValue}%${catatanBengkel ? `. Catatan: ${catatanBengkel}` : ''}`,
      },
    })

    // Update vehicle condition if service is completed
    if (progressValue === 100) {
      await db.vehicle.update({
        where: { id: service.vehicleId },
        data: { kondisiKendaraan: 'BAIK' },
      })
    }

    return NextResponse.json({ data: updatedService })
  } catch (error) {
    console.error('Error updating progress:', error)
    return NextResponse.json({ error: 'Gagal mengupdate progress' }, { status: 500 })
  }
}
