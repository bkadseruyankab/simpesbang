import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/service/[id]/approve - Approve or reject service
// Supports two flows:
// 1. DIAJUKAN → DISETUJUI (admin approves new service request)
// 2. MENUNGGU_PERSETUJUAN → SELESAI (admin approves bengkel's completion)
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { action, rejectedReason, approvedBy } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action harus approve atau reject' }, { status: 400 })
    }

    const service = await db.service.findUnique({
      where: { id },
      include: { vehicle: true, bengkel: true },
    })
    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    const isApprovalFlow = service.statusService === 'DIAJUKAN'
    const isCompletionApproval = service.statusService === 'MENUNGGU_PERSETUJUAN'

    if (!isApprovalFlow && !isCompletionApproval) {
      return NextResponse.json(
        { error: 'Hanya service dengan status DIAJUKAN atau MENUNGGU_PERSETUJUAN yang dapat diproses' },
        { status: 400 }
      )
    }

    let newStatus: string
    let historyKeterangan: string
    let updateData: Record<string, unknown>

    if (isApprovalFlow) {
      // Flow 1: Admin approves/rejects new service request
      if (action === 'approve') {
        newStatus = 'DISETUJUI'
        historyKeterangan = 'Service disetujui oleh admin'
        updateData = {
          statusService: newStatus,
          approvedBy: approvedBy || 'admin',
          approvedAt: new Date(),
          rejectedReason: null,
          progress: 0,
        }
      } else {
        if (!rejectedReason) {
          return NextResponse.json(
            { error: 'Alasan penolakan wajib diisi' },
            { status: 400 }
          )
        }
        newStatus = 'DITOLAK'
        historyKeterangan = `Service ditolak: ${rejectedReason}`
        updateData = {
          statusService: newStatus,
          approvedBy: null,
          approvedAt: null,
          rejectedReason,
        }
      }
    } else {
      // Flow 2: Admin approves/rejects bengkel's completion
      if (action === 'approve') {
        newStatus = 'SELESAI'
        historyKeterangan = 'Pekerjaan bengkel disetujui. Service selesai.'
        updateData = {
          statusService: newStatus,
          tanggalSelesai: new Date(),
          progress: 100,
        }

        // Update vehicle condition to BAIK
        await db.vehicle.update({
          where: { id: service.vehicleId },
          data: { kondisiKendaraan: 'BAIK' },
        })

        // Update budget realisasi
        const currentYear = new Date().getFullYear()
        const budget = await db.budget.findFirst({
          where: { vehicleId: service.vehicleId, tahun: currentYear },
        })
        if (budget) {
          const newRealisasi = budget.realisasi + service.totalBiaya
          await db.budget.update({
            where: { id: budget.id },
            data: {
              realisasi: newRealisasi,
              sisaAnggaran: budget.totalAnggaran - newRealisasi,
              statusAnggaran: (budget.totalAnggaran - newRealisasi) <= 0 ? 'HABIS' : 'AKTIF',
            },
          })
          await db.budgetHistory.create({
            data: {
              budgetId: budget.id,
              perubahan: service.totalBiaya,
              keterangan: `Realisasi dari service ${service.nomorService}`,
              changedBy: approvedBy,
            },
          })
        }
      } else {
        if (!rejectedReason) {
          return NextResponse.json(
            { error: 'Alasan penolakan wajib diisi' },
            { status: 400 }
          )
        }
        newStatus = 'DIPROSES'
        historyKeterangan = `Penyelesaian service ditolak admin: ${rejectedReason}. Service dikembalikan ke status DIPROSES.`
        updateData = {
          statusService: newStatus,
          rejectedReason,
          progress: Math.max(service.progress - 10, 50), // reduce progress slightly
        }
      }
    }

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
        keterangan: historyKeterangan,
      },
    })

    // Notify bengkel about the approval/rejection
    if (service.bengkelId) {
      const bengkelUsers = await db.user.findMany({
        where: { bengkelId: service.bengkelId, isActive: true },
      })
      for (const bUser of bengkelUsers) {
        await db.notification.create({
          data: {
            userId: bUser.id,
            title: isCompletionApproval
              ? (action === 'approve' ? 'Service Disetujui' : 'Service Ditolak')
              : (action === 'approve' ? 'Service Disetujui' : 'Service Ditolak'),
            message: isCompletionApproval
              ? (action === 'approve'
                ? `Service ${service.nomorService} telah disetujui admin dan ditandai selesai.`
                : `Penyelesaian service ${service.nomorService} ditolak admin. Alasan: ${rejectedReason}. Silakan perbaiki dan ajukan kembali.`)
              : (action === 'approve'
                ? `Service ${service.nomorService} telah disetujui. Silakan mulai pengerjaan.`
                : `Service ${service.nomorService} ditolak. Alasan: ${rejectedReason}`),
            type: action === 'approve' ? 'SUCCESS' : 'ERROR',
          },
        })
      }
    }

    return NextResponse.json({ data: updatedService })
  } catch (error) {
    console.error('Error approving/rejecting service:', error)
    return NextResponse.json({ error: 'Gagal memproses persetujuan' }, { status: 500 })
  }
}
