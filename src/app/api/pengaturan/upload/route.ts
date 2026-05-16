import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const LOGO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml']
const LOGO_MAX_SIZE = 2 * 1024 * 1024 // 2MB

const FAVICON_ALLOWED_TYPES = ['image/x-icon', 'image/png', 'image/svg+xml']
const FAVICON_MAX_SIZE = 1 * 1024 * 1024 // 1MB

const SETTING_KEY_MAP: Record<string, string> = {
  logo: 'app_logo',
  favicon: 'app_favicon',
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null

    // Validate type
    if (!type || (type !== 'logo' && type !== 'favicon')) {
      return NextResponse.json(
        { success: false, message: 'Invalid type. Must be "logo" or "favicon".' },
        { status: 400 }
      )
    }

    // Validate file
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided.' },
        { status: 400 }
      )
    }

    // Validate MIME type and size based on type
    const allowedTypes = type === 'logo' ? LOGO_ALLOWED_TYPES : FAVICON_ALLOWED_TYPES
    const maxSize = type === 'logo' ? LOGO_MAX_SIZE : FAVICON_MAX_SIZE

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid file type "${file.type}". Allowed types: ${allowedTypes.join(', ')}`,
        },
        { status: 400 }
      )
    }

    if (file.size > maxSize) {
      const maxMB = (maxSize / (1024 * 1024)).toFixed(0)
      return NextResponse.json(
        { success: false, message: `File size exceeds the ${maxMB}MB limit.` },
        { status: 400 }
      )
    }

    // Build unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const uniqueFilename = `${type}-${timestamp}-${sanitizedName}`

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'settings')
    const fullFilePath = path.join(uploadsDir, uniqueFilename)
    const relativePath = `/uploads/settings/${uniqueFilename}`

    // Check for existing file in SystemSetting and delete it
    const settingKey = SETTING_KEY_MAP[type]
    const existingSetting = await db.systemSetting.findUnique({
      where: { key: settingKey },
    })

    if (existingSetting?.value) {
      const oldFilePath = path.join(process.cwd(), 'public', existingSetting.value)
      if (existsSync(oldFilePath)) {
        try {
          await unlink(oldFilePath)
        } catch {
          // Ignore errors when deleting old file — it may already be gone
        }
      }
    }

    // Write the new file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(fullFilePath, buffer)

    // Upsert the setting in the database
    await db.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: relativePath },
      create: { key: settingKey, value: relativePath },
    })

    return NextResponse.json({
      success: true,
      key: settingKey,
      path: relativePath,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error during file upload.' },
      { status: 500 }
    )
  }
}
