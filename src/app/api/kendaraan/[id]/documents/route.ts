import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getCompressionSettings, shouldCompress, compressImage } from '@/lib/compress'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const documents = await db.vehicleDocument.findMany({
      where: { vehicleId: id },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil dokumen' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const jenisDokumen = formData.get('jenisDokumen') as string

    if (!file) {
      return NextResponse.json(
        { error: 'File wajib diunggah' },
        { status: 400 }
      )
    }

    if (!jenisDokumen) {
      return NextResponse.json(
        { error: 'Jenis dokumen wajib diisi' },
        { status: 400 }
      )
    }

    // Verify vehicle exists
    const vehicle = await db.vehicle.findUnique({ where: { id } })
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Kendaraan tidak ditemukan' },
        { status: 404 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'documents')
    await mkdir(uploadsDir, { recursive: true })

    // Get file buffer
    const bytes = await file.arrayBuffer()
    let buffer = Buffer.from(bytes)
    let finalMimeType = file.type
    let finalFileSize = file.size

    // Apply compression for images
    const compressionSettings = await getCompressionSettings()
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

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    let fileName = `${timestamp}_${sanitizedName}`

    // If format changed due to compression, update the extension
    if (finalMimeType === 'image/webp' && !sanitizedName.endsWith('.webp')) {
      const baseName = sanitizedName.replace(/\.[^.]+$/, '')
      fileName = `${timestamp}_${baseName}.webp`
    } else if (finalMimeType === 'image/jpeg' && !sanitizedName.match(/\.(jpg|jpeg)$/)) {
      const baseName = sanitizedName.replace(/\.[^.]+$/, '')
      fileName = `${timestamp}_${baseName}.jpg`
    }

    const filePath = path.join(uploadsDir, fileName)

    // Write file
    await writeFile(filePath, buffer)

    // Save document record
    const document = await db.vehicleDocument.create({
      data: {
        vehicleId: id,
        jenisDokumen,
        fileName: file.name,
        filePath: `/uploads/documents/${fileName}`,
        fileSize: finalFileSize,
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Gagal mengunggah dokumen' },
      { status: 500 }
    )
  }
}
