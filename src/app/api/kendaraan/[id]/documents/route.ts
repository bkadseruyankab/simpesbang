import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}_${sanitizedName}`
    const filePath = path.join(uploadsDir, fileName)

    // Write file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Save document record
    const document = await db.vehicleDocument.create({
      data: {
        vehicleId: id,
        jenisDokumen,
        fileName: file.name,
        filePath: `/uploads/documents/${fileName}`,
        fileSize: file.size,
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
