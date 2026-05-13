import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { unlink } from 'fs/promises'
import path from 'path'

type RouteContext = { params: Promise<{ id: string; docId: string }> }

// DELETE /api/service/[id]/documents/[docId] - Delete a document
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id, docId } = await context.params

    const document = await db.serviceDocument.findFirst({
      where: { id: docId, serviceId: id },
    })

    if (!document) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    // Try to delete file from disk
    try {
      const fullPath = path.join(process.cwd(), 'public', document.filePath)
      await unlink(fullPath)
    } catch {
      // File may not exist on disk, continue to delete DB record
      console.warn('File not found on disk:', document.filePath)
    }

    await db.serviceDocument.delete({
      where: { id: docId },
    })

    return NextResponse.json({ message: 'Dokumen berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Gagal menghapus dokumen' }, { status: 500 })
  }
}
