import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

type RouteContext = { params: Promise<{ id: string; itemId: string }> }

// POST /api/service/[id]/items/[itemId]/photos - Upload multiple photos for a service item
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id, itemId } = await context.params

    // Verify service exists
    const service = await db.service.findUnique({ where: { id } })
    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    // Verify item belongs to this service
    const item = await db.serviceItem.findFirst({
      where: { id: itemId, serviceId: id },
    })
    if (!item) {
      return NextResponse.json({ error: 'Item service tidak ditemukan' }, { status: 404 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const keterangan = (formData.get('keterangan') as string) || null

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Tidak ada file yang diupload' }, { status: 400 })
    }

    if (files.length > 10) {
      return NextResponse.json({ error: 'Maksimal 10 file per upload' }, { status: 400 })
    }

    // Validate each file
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Tipe file ${file.name} tidak didukung. Gunakan JPG atau PNG` },
          { status: 400 }
        )
      }
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File ${file.name} melebihi batas 5MB` },
          { status: 400 }
        )
      }
    }

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'item-photos')
    await mkdir(uploadDir, { recursive: true })

    const photos = []
    for (const file of files) {
      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const uniqueName = `${timestamp}-${randomSuffix}-${sanitizedName}`
      const filePath = path.join(uploadDir, uniqueName)

      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filePath, buffer)

      const photo = await db.serviceItemPhoto.create({
        data: {
          itemId,
          fileName: file.name,
          filePath: `/uploads/item-photos/${uniqueName}`,
          fileSize: file.size,
          fileType: file.type,
          keterangan,
        },
      })
      photos.push(photo)
    }

    return NextResponse.json({ data: photos }, { status: 201 })
  } catch (error) {
    console.error('Error uploading item photos:', error)
    return NextResponse.json({ error: 'Gagal mengupload foto' }, { status: 500 })
  }
}

// GET /api/service/[id]/items/[itemId]/photos - List all photos for a service item
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id, itemId } = await context.params

    // Verify service exists
    const service = await db.service.findUnique({ where: { id } })
    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    // Verify item belongs to this service
    const item = await db.serviceItem.findFirst({
      where: { id: itemId, serviceId: id },
    })
    if (!item) {
      return NextResponse.json({ error: 'Item service tidak ditemukan' }, { status: 404 })
    }

    const photos = await db.serviceItemPhoto.findMany({
      where: { itemId },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json({ data: photos })
  } catch (error) {
    console.error('Error fetching item photos:', error)
    return NextResponse.json({ error: 'Gagal mengambil foto' }, { status: 500 })
  }
}
