import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/service/[id]/documents - Upload nota/document
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { fileName, filePath, fileSize } = body

    if (!fileName || !filePath) {
      return NextResponse.json({ error: 'Nama file dan path wajib diisi' }, { status: 400 })
    }

    const service = await db.service.findUnique({ where: { id } })
    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    const document = await db.serviceDocument.create({
      data: {
        serviceId: id,
        fileName,
        filePath,
        fileSize: fileSize || null,
      },
    })

    return NextResponse.json({ data: document }, { status: 201 })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json({ error: 'Gagal mengupload dokumen' }, { status: 500 })
  }
}
