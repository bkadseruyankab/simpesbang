import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { unlink } from 'fs/promises'
import path from 'path'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params

    // Verify document exists and belongs to vehicle
    const document = await db.vehicleDocument.findFirst({
      where: { id: docId, vehicleId: id },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    // Delete file from filesystem
    try {
      const fullPath = path.join(process.cwd(), 'public', document.filePath)
      await unlink(fullPath)
    } catch {
      // File might already be deleted, continue with DB deletion
      console.warn('File not found on disk, continuing with DB deletion')
    }

    // Delete from database
    await db.vehicleDocument.delete({
      where: { id: docId },
    })

    return NextResponse.json({ message: 'Dokumen berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus dokumen' },
      { status: 500 }
    )
  }
}
