import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFileSync, statSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    // Get last backup info
    const lastBackupSetting = await db.systemSetting.findUnique({
      where: { key: 'last_backup_date' },
    })

    // Get DB stats
    const [userCount, vehicleCount, serviceCount, workshopCount] = await Promise.all([
      db.user.count(),
      db.vehicle.count(),
      db.service.count(),
      db.workshop.count(),
    ])

    // Try to get the DB file info
    let dbSize = 0
    try {
      const dbPath = join(process.cwd(), 'db', 'custom.db')
      const stats = statSync(dbPath)
      dbSize = stats.size
    } catch {}

    return NextResponse.json({
      lastBackup: lastBackupSetting?.value || null,
      stats: {
        users: userCount,
        vehicles: vehicleCount,
        services: serviceCount,
        workshops: workshopCount,
        dbSize,
        dbSizeFormatted: dbSize > 0 ? `${(dbSize / 1024).toFixed(1)} KB` : 'N/A',
      },
    })
  } catch (error) {
    console.error('Error fetching backup info:', error)
    return NextResponse.json({ error: 'Failed to fetch backup info' }, { status: 500 })
  }
}

export async function POST() {
  try {
    // Record backup timestamp
    const now = new Date().toISOString()
    await db.systemSetting.upsert({
      where: { key: 'last_backup_date' },
      update: { value: now },
      create: { key: 'last_backup_date', value: now },
    })

    // Read the SQLite database file
    const dbPath = join(process.cwd(), 'db', 'custom.db')
    const buffer = readFileSync(dbPath)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename=bkad-backup-${new Date().toISOString().slice(0, 10)}.db`,
      },
    })
  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 })
  }
}
