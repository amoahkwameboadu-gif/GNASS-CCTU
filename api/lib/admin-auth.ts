import { timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export function requireAdmin(req: VercelRequest, res: VercelResponse): boolean {
  const expected = process.env.GNAAS_ADMIN_TOKEN
  if (!expected) {
    res.status(503).json({ error: 'Admin sign-in is not configured. Set GNAAS_ADMIN_TOKEN in Vercel, then redeploy.' })
    return false
  }

  const authorization = req.headers.authorization || ''
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const suppliedBytes = Buffer.from(supplied)
  const expectedBytes = Buffer.from(expected)
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
    res.status(401).json({ error: 'Invalid or missing admin access token. Sign in again.' })
    return false
  }

  return true
}
