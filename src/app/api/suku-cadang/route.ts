import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const isActive = searchParams.get('isActive') || ''

    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { namaSukuCadang: { contains: search } },
        { supplier: { contains: search } },
      ]
    }

    if (isActive !== '') {
      where.isActive = isActive === 'true'
    }

    const [data, total] = await Promise.all([
      db.sparePart.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.sparePart.count({ where }),
    ])

    // Summary
    const allParts = await db.sparePart.findMany({
      where: { isActive: true },
      select: { stok: true, hargaSatuan: true },
    })
    const totalItems = allParts.reduce((sum, p) => sum + p.stok, 0)
    const lowStockCount = allParts.filter(p => p.stok < 5).length

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalItems,
        lowStockCount,
      }
    })
  } catch (error) {
    console.error('Error fetching spare parts:', error)
    return NextResponse.json({ error: 'Gagal mengambil data suku cadang' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { namaSukuCadang, qty, hargaSatuan, supplier, stok, keterangan, isActive } = body

    if (!namaSukuCadang) {
      return NextResponse.json({ error: 'Nama suku cadang wajib diisi' }, { status: 400 })
    }

    const sparePart = await db.sparePart.create({
      data: {
        namaSukuCadang,
        qty: qty !== undefined ? parseInt(qty) : 0,
        hargaSatuan: hargaSatuan !== undefined ? parseFloat(hargaSatuan) : 0,
        supplier: supplier || null,
        stok: stok !== undefined ? parseInt(stok) : 0,
        keterangan: keterangan || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    return NextResponse.json(sparePart, { status: 201 })
  } catch (error) {
    console.error('Error creating spare part:', error)
    return NextResponse.json({ error: 'Gagal membuat suku cadang' }, { status: 500 })
  }
}
