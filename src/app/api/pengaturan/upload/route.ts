import { NextRequest, NextResponse } from 'next/server'
import { storeBlobFile } from '@/lib/blob-store'

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

    // Store as blob file in database (with compression for non-SVG)
    const settingKey = SETTING_KEY_MAP[type]
    const context = type === 'logo' ? 'logo' : 'favicon'

    const result = await storeBlobFile(settingKey, file, context)

    return NextResponse.json({
      success: true,
      key: settingKey,
      path: result.filePath,
      fileSize: result.fileSize,
      wasCompressed: result.wasCompressed,
      savedBytes: result.savedBytes,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error during file upload.' },
      { status: 500 }
    )
  }
}
