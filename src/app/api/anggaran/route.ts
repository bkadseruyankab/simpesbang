import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const tahun = searchParams.get('tahun') || ''
    const vehicleId = searchParams.get('vehicleId') || ''
    const statusAnggaran = searchParams.get('statusAnggaran') || ''

    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.vehicle = {
        nomorPolisi: { contains: search }
      }
    }

    if (tahun) {
      where.tahun = parseInt(tahun)
    }

    if (vehicleId) {
      where.vehicleId = vehicleId
    }

    if (statusAnggaran) {
      where.statusAnggaran = statusAnggaran
    }

    const [data, total] = await Promise.all([
      db.budget.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              nomorPolisi: true,
              namaPengguna: true,
              merk: true,
              type: true,
            }
          },
          history: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.budget.count({ where }),
    ])

    // Calculate summaries for filtered year
    const summaryYear = tahun ? parseInt(tahun) : new Date().getFullYear()
    const yearWhere: Record<string, unknown> = { tahun: summaryYear }

    const summaries = await db.budget.findMany({
      where: yearWhere,
      select: {
        totalAnggaran: true,
        realisasi: true,
        sisaAnggaran: true,
        statusAnggaran: true,
      }
    })

    const totalAnggaranTahun = summaries.reduce((sum, b) => sum + b.totalAnggaran, 0)
    const totalRealisasi = summaries.reduce((sum, b) => sum + b.realisasi, 0)
    const totalSisaAnggaran = summaries.reduce((sum, b) => sum + b.sisaAnggaran, 0)
    const overBudgetCount = summaries.filter(b => b.statusAnggaran === 'HABIS').length

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalAnggaranTahun,
        totalRealisasi,
        totalSisaAnggaran,
        overBudgetCount,
      }
    })
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json({ error: 'Gagal mengambil data anggaran' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tahun, vehicleId, totalAnggaran, realisasi, statusAnggaran } = body

    if (!tahun || !vehicleId || totalAnggaran === undefined) {
      return NextResponse.json({ error: 'Tahun, kendaraan, dan total anggaran wajib diisi' }, { status: 400 })
    }

    // Check if budget already exists for this vehicle and year
    const existing = await db.budget.findUnique({
      where: { tahun_vehicleId: { tahun: parseInt(tahun), vehicleId } }
    })

    if (existing) {
      return NextResponse.json({ error: 'Anggaran untuk kendaraan dan tahun ini sudah ada' }, { status: 400 })
    }

    const realisasiValue = realisasi || 0
    const sisaAnggaran = totalAnggaran - realisasiValue
    const finalStatus = statusAnggaran || (sisaAnggaran <= 0 ? 'HABIS' : 'AKTIF')

    const budget = await db.budget.create({
      data: {
        tahun: parseInt(tahun),
        vehicleId,
        totalAnggaran: parseFloat(totalAnggaran),
        realisasi: parseFloat(realisasiValue),
        sisaAnggaran: parseFloat(sisaAnggaran),
        statusAnggaran: finalStatus,
      },
      include: {
        vehicle: {
          select: {
            id: true,
            nomorPolisi: true,
            namaPengguna: true,
          }
        }
      }
    })

    // Create budget history entry
    await db.budgetHistory.create({
      data: {
        budgetId: budget.id,
        perubahan: parseFloat(totalAnggaran),
        keterangan: 'Anggaran awal dibuat',
      }
    })

    return NextResponse.json(budget, { status: 201 })
  } catch (error) {
    console.error('Error creating budget:', error)
    return NextResponse.json({ error: 'Gagal membuat anggaran' }, { status: 500 })
  }
}
