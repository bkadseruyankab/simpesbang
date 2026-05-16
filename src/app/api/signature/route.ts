import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/signature?userId=xxx - Get current user's active signature
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 })
    }

    const signature = await db.signature.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!signature) {
      return NextResponse.json({ signature: null })
    }

    return NextResponse.json({ signature })
  } catch (error) {
    console.error('Error fetching signature:', error)
    return NextResponse.json({ error: 'Gagal mengambil tanda tangan' }, { status: 500 })
  }
}

// POST /api/signature - Save/update signature
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, imageData } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 })
    }

    if (!imageData) {
      return NextResponse.json({ error: 'Data tanda tangan diperlukan' }, { status: 400 })
    }

    // Validate that the imageData is a valid base64 PNG
    if (!imageData.startsWith('data:image/png;base64,') && !imageData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Format gambar tidak valid' }, { status: 400 })
    }

    // Deactivate all existing signatures for this user
    await db.signature.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    })

    // Create new signature
    const signature = await db.signature.create({
      data: {
        userId,
        imageData,
        isActive: true,
      },
    })

    return NextResponse.json({ signature }, { status: 201 })
  } catch (error) {
    console.error('Error saving signature:', error)
    return NextResponse.json({ error: 'Gagal menyimpan tanda tangan' }, { status: 500 })
  }
}
