import type { VercelRequest, VercelResponse } from '@vercel/node'
import { findUser } from './users'
import { readSession, sessionConfigured, type SessionUser } from './session'

export function currentUser(req: VercelRequest): SessionUser | null {
  return readSession(req)
}

export async function requireAdmin(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  if (!sessionConfigured()) {
    res.status(503).json({
      error:
        'Admin accounts are not configured yet. Set SESSION_SECRET in Vercel (a long random string), then redeploy.',
    })
    return false
  }

  const session = readSession(req)
  if (!session) {
    res.status(401).json({ error: 'Please sign in to continue.' })
    return false
  }

  const user = await findUser(session.username)
  if (!user) {
    res.status(401).json({ error: 'That account no longer exists. Sign in again.' })
    return false
  }

  return true
}