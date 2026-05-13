import { db } from '@/lib/db'

/**
 * Notification helper functions for the Vehicle Service Information System.
 *
 * Every public function:
 *   1. Persists an in-app Notification record in the database (always succeeds)
 *   2. Attempts to send WA / Email via z-ai-web-dev-sdk (best-effort, wrapped in try/catch)
 */

// ---------------------------------------------------------------------------
// WA / Email external sending (best-effort)
// ---------------------------------------------------------------------------

async function sendWAExternal(phone: string, message: string): Promise<void> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    // Use the SDK's function invocation to trigger an external notification service.
    // The actual delivery depends on the configured gateway / function endpoint.
    await zai.functions.invoke('send_whatsapp', {
      to: phone,
      message,
    })
  } catch (error) {
    // Best-effort – log but never throw
    console.warn('[Notification] WA send failed (best-effort):', error instanceof Error ? error.message : error)
  }
}

async function sendEmailExternal(email: string, subject: string, body: string): Promise<void> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    await zai.functions.invoke('send_email', {
      to: email,
      subject,
      body,
    })
  } catch (error) {
    console.warn('[Notification] Email send failed (best-effort):', error instanceof Error ? error.message : error)
  }
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Create an in-app notification for a specific user + attempt WA/Email.
 */
export async function sendNotificationToUser(
  userId: string,
  title: string,
  message: string,
  type: string = 'INFO',
): Promise<void> {
  // 1. Always create in-app notification
  await db.notification.create({
    data: { userId, title, message, type },
  })

  // 2. Best-effort WA/Email
  try {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return

    const waPromise = user.phone ? sendWAExternal(user.phone, `${title}\n\n${message}`) : Promise.resolve()
    const emailPromise = user.email ? sendEmailExternal(user.email, title, message) : Promise.resolve()

    await Promise.allSettled([waPromise, emailPromise])
  } catch (error) {
    console.warn('[Notification] External send failed for user:', error instanceof Error ? error.message : error)
  }
}

/**
 * Create in-app notifications for ALL active users belonging to a bengkel
 * + attempt WA/Email for each.
 */
export async function sendNotificationToBengkel(
  bengkelId: string,
  title: string,
  message: string,
  type: string = 'INFO',
): Promise<void> {
  const users = await db.user.findMany({
    where: { bengkelId, isActive: true },
  })

  await Promise.allSettled(
    users.map((u) => sendNotificationToUser(u.id, title, message, type)),
  )
}

/**
 * Create in-app notifications for ALL active admin / super_admin users
 * + attempt WA/Email for each.
 */
export async function sendNotificationToAdmins(
  title: string,
  message: string,
  type: string = 'INFO',
): Promise<void> {
  const admins = await db.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, isActive: true },
  })

  await Promise.allSettled(
    admins.map((a) => sendNotificationToUser(a.id, title, message, type)),
  )
}
