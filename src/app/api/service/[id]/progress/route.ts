import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

// PUT /api/service/[id]/progress - Update service progress
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { progress, statusService, catatanBengkel, markAsSelesai } = body

    const service = await db.service.findUnique({ where: { id } })
    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    if (!['DISETUJUI', 'DIPROSES', 'PENDING', 'MENUNGGU_PERSETUJUAN'].includes(service.statusService)) {
      return NextResponse.json(
        { error: 'Progress hanya dapat diupdate untuk service DISETUJUI, DIPROSES, PENDING, atau MENUNGGU_PERSETUJUAN' },
        { status: 400 }
      )
    }

    const progressValue = Math.min(100, Math.max(0, progress || 0))

    let newStatus = statusService || service.statusService

    // If bengkel marks as "selesai" (markAsSelesai flag), set to MENUNGGU_PERSETUJUAN
    if (markAsSelesai) {
      newStatus = 'MENUNGGU_PERSETUJUAN'
    } else if (progressValue === 100) {
      // If progress reaches 100 without markAsSelesai, set to MENUNGGU_PERSETUJUAN 
      // (bengkel workflow: need admin approval)
      newStatus = 'MENUNGGU_PERSETUJUAN'
    } else if (progressValue > 0 && newStatus === 'DISETUJUI') {
      newStatus = 'DIPROSES'
    }

    const updateData: Record<string, unknown> = {
      progress: progressValue,
      statusService: newStatus,
      catatanBengkel: catatanBengkel !== undefined ? catatanBengkel : undefined,
    }

    // Don't set tanggalSelesai yet - wait for admin approval
    // Only set tanggalSelesai when status is SELESAI (approved by admin)

    const updatedService = await db.service.update({
      where: { id },
      data: updateData,
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
        keterangan: `Progress diupdate ke ${progressValue}%${catatanBengkel ? `. Catatan: ${catatanBengkel}` : ''}${markAsSelesai ? '. Bengkel menandai selesai, menunggu persetujuan admin.' : ''}`,
      },
    })

    // Create notification for admin when bengkel marks as complete
    if (newStatus === 'MENUNGGU_PERSETUJUAN') {
      const admins = await db.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, isActive: true },
      })
      for (const admin of admins) {
        await db.notification.create({
          data: {
            userId: admin.id,
            title: 'Service Menunggu Persetujuan',
            message: `Service ${service.nomorService} (${updatedService.vehicle?.nomorPolisi || '-'}) telah selesai dikerjakan bengkel dan menunggu persetujuan Anda.`,
            type: 'WARNING',
          },
        })
      }
    }

    return NextResponse.json({ data: updatedService })
  } catch (error) {
    console.error('Error updating progress:', error)
    return NextResponse.json({ error: 'Gagal mengupdate progress' }, { status: 500 })
  }
}
