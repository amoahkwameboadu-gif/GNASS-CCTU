import { createHmac, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const COOKIE_NAME = 'gnaas_session'
const SESSION_DAYS = 7
const MAX_AGE_SECONDS = SESSION_DAYS * 24 * 60 * 60

export interface SessionUser {
  username: string
  role: 'owner' | 'editor'
}

function sessionSecret(): string {
  return process.env.SESSION_SECRET || process.env.GITHUB_TOKEN || ''
}

export function sessionConfigured(): boolean {
  return sessionSecret().length > 0
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function parseCookies(header: string | undefined): Record<string, string> {
  const jar: Record<string, string> = {}
  if (!header) return jar
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index < 1) continue
    const name = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (name) jar[name] = decodeURIComponent(value)
  }
  return jar
}

function createToken(username: string, role: SessionUser['role']): string {
  const secret = sessionSecret()
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000
  const payload = `${Buffer.from(username).toString('base64url')}.${expiresAt}.${role}`
  return `${payload}.${sign(payload, secret)}`
}

function readToken(token: string | undefined): SessionUser | null {
  const secret = sessionSecret()
  if (!token || !secret) return null

  const parts = token.split('.')
  if (parts.length !== 4) return null

  const [encodedUsername, expiresAt, role, signature] = parts
  const payload = `${encodedUsername}.${expiresAt}.${role}`

  const expected = Buffer.from(sign(payload, secret))
  const supplied = Buffer.from(signature)
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null

  const expiry = Number(expiresAt)
  if (!Number.isFinite(expiry) || Date.now() > expiry) return null

  const username = Buffer.from(encodedUsername, 'base64url').toString('utf-8')
  if (!username) return null

  return { username, role: role === 'owner' ? 'owner' : 'editor' }
}

export function readSession(req: VercelRequest): SessionUser | null {
  return readToken(parseCookies(req.headers.cookie)[COOKIE_NAME])
}

export function startSession(res: VercelResponse, user: SessionUser): void {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${createToken(user.username, user.role)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  )
}

export function endSession(res: VercelResponse): void {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  )
}