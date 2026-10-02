import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64

export interface PasswordRecord {
  salt: string
  passwordHash: string
}

export function hashPassword(password: string): PasswordRecord {
  const salt = randomBytes(16).toString('hex')
  const passwordHash = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return { salt, passwordHash }
}

export function verifyPassword(password: string, record: PasswordRecord): boolean {
  if (!record?.salt || !record?.passwordHash) return false
  const expected = Buffer.from(record.passwordHash, 'hex')
  const actual = scryptSync(password, record.salt, KEY_LENGTH)
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}

export function passwordProblem(password: string): string | null {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters.'
  }
  if (password.length > 200) {
    return 'Password must be under 200 characters.'
  }
  return null
}