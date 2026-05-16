import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getCompressionSettings, shouldCompress, compressImage } from '@/lib/compress'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/service/[id]/documents - Upload multiple nota/documents
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const service = await db.service.findUnique({ where: { id } })
    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const jenisDokumen = (formData.get('jenisDokumen') as string) || 'NOTA'

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Tidak ada file yang diupload' }, { status: 400 })
    }

    const validJenis = ['NOTA', 'KWITANSI', 'FAKTUR', 'LAINNYA']
    if (!validJenis.includes(jenisDokumen)) {
      return NextResponse.json({ error: 'Jenis dokumen tidak valid' }, { status: 400 })
    }

    if (files.length > 10) {
      return NextResponse.json({ error: 'Maksimal 10 file per upload' }, { status: 400 })
    }

    // Validate each file
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Tipe file ${file.name} tidak didukung. Gunakan JPG, PNG, atau PDF` },
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
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'nota')
    await mkdir(uploadDir, { recursive: true })

    // Get compression settings
    const compressionSettings = await getCompressionSettings()

    const documents = []
    for (const file of files) {
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

      // Get file buffer
      let buffer = Buffer.from(await file.arrayBuffer())
      let finalMimeType = file.type
      let finalFileSize = file.size

      // Apply compression for images
      if (shouldCompress(compressionSettings, file.type, 'document')) {
        const result = await compressImage(buffer, file.type, compressionSettings)
        buffer = result.buffer
        finalMimeType = result.metadata.format || file.type
        finalFileSize = buffer.length

        // Update compression stats
        if (result.metadata.wasCompressed) {
          try {
            await db.systemSetting.upsert({
              where: { key: 'compress_total_saved' },
              update: { value: (parseInt((await db.systemSetting.findUnique({ where: { key: 'compress_total_saved' } }))?.value || '0') + result.metadata.savedBytes).toString() },
              create: { key: 'compress_total_saved', value: result.metadata.savedBytes.toString() },
            })
            await db.systemSetting.upsert({
              where: { key: 'compress_total_files' },
              update: { value: (parseInt((await db.systemSetting.findUnique({ where: { key: 'compress_total_files' } }))?.value || '0') + 1).toString() },
              create: { key: 'compress_total_files', value: '1' },
            })
          } catch {
            // Ignore stats update errors
          }
        }
      }

      // Build filename with correct extension
      let uniqueName = `${timestamp}-${sanitizedName}`
      if (finalMimeType === 'image/webp' && !sanitizedName.endsWith('.webp')) {
        const baseName = sanitizedName.replace(/\.[^.]+$/, '')
        uniqueName = `${timestamp}-${baseName}.webp`
      } else if (finalMimeType === 'image/jpeg' && !sanitizedName.match(/\.(jpg|jpeg)$/)) {
        const baseName = sanitizedName.replace(/\.[^.]+$/, '')
        uniqueName = `${timestamp}-${baseName}.jpg`
      }

      const filePath = path.join(uploadDir, uniqueName)
      await writeFile(filePath, buffer)

      const doc = await db.serviceDocument.create({
        data: {
          serviceId: id,
          fileName: file.name,
          filePath: `/uploads/nota/${uniqueName}`,
          fileSize: finalFileSize,
          fileType: finalMimeType,
          jenisDokumen,
        },
      })
      documents.push(doc)
    }

    return NextResponse.json({ data: documents }, { status: 201 })
  } catch (error) {
    console.error('Error uploading documents:', error)
    return NextResponse.json({ error: 'Gagal mengupload dokumen' }, { status: 500 })
  }
}

// GET /api/service/[id]/documents - List documents for a service
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const service = await db.service.findUnique({ where: { id } })
    if (!service || service.isDeleted) {
      return NextResponse.json({ error: 'Service tidak ditemukan' }, { status: 404 })
    }

    const documents = await db.serviceDocument.findMany({
      where: { serviceId: id },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json({ data: documents })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Gagal mengambil dokumen' }, { status: 500 })
  }
}
