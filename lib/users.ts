import { randomUUID } from 'node:crypto'
import { readJSON, writeJSON } from './github-storage'
import { hashPassword, verifyPassword, type PasswordRecord } from './password'

const USERS_PATH = 'data/admin-users.json'

export type AdminRole = 'owner' | 'editor'

export interface AdminUser extends PasswordRecord {
  id: string
  username: string
  role: AdminRole
  createdAt: string
  lastLoginAt?: string
}

interface UsersFile {
  users: AdminUser[]
}

const EMPTY: UsersFile = { users: [] }

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/

export function usernameProblem(username: string): string | null {
  if (typeof username !== 'string') return 'Username is required.'
  const normalized = normalizeUsername(username)
  if (!normalized) return 'Username is required.'
  if (!USERNAME_PATTERN.test(normalized)) {
    return 'Username must be 3-32 characters: letters, numbers, dot, dash or underscore.'
  }
  return null
}

export function normalizeUsername(username: string): string {
  return String(username ?? '').trim().toLowerCase()
}

async function readUsersFile(): Promise<UsersFile> {
  const file = await readJSON<UsersFile>(USERS_PATH, EMPTY)
  return Array.isArray(file?.users) ? file : EMPTY
}

async function writeUsersFile(users: AdminUser[]): Promise<void> {
  await writeJSON(USERS_PATH, { users }, 'Update admin portal accounts')
}

export async function listUsers(): Promise<AdminUser[]> {
  return (await readUsersFile()).users
}

export async function findUser(username: string): Promise<AdminUser | null> {
  const normalized = normalizeUsername(username)
  if (!normalized) return null
  const users = await listUsers()
  return users.find((user) => user.username === normalized) ?? null
}

export async function createUser(
  username: string,
  password: string,
  role?: AdminRole,
): Promise<AdminUser> {
  const normalized = normalizeUsername(username)
  const users = await listUsers()

  if (users.some((user) => user.username === normalized)) {
    throw Object.assign(new Error('That username is already taken.'), { status: 409 })
  }

  const record = hashPassword(password)
  const user: AdminUser = {
    id: randomUUID(),
    username: normalized,
    salt: record.salt,
    passwordHash: record.passwordHash,
    role: role ?? (users.length === 0 ? 'owner' : 'editor'),
    createdAt: new Date().toISOString(),
  }

  await writeUsersFile([...users, user])
  return user
}

export async function authenticate(username: string, password: string): Promise<AdminUser | null> {
  const user = await findUser(username)
  if (!user) return null
  if (!verifyPassword(password, user)) return null
  return user
}

export async function recordLogin(userId: string): Promise<void> {
  const users = await listUsers()
  let changed = false
  const next = users.map((user) => {
    if (user.id !== userId) return user
    changed = true
    return { ...user, lastLoginAt: new Date().toISOString() }
  })
  if (changed) await writeUsersFile(next)
}

export async function removeUser(username: string): Promise<boolean> {
  const normalized = normalizeUsername(username)
  const users = await listUsers()
  const next = users.filter((user) => user.username !== normalized)
  if (next.length === users.length) return false
  await writeUsersFile(next)
  return true
}

export async function countOwners(): Promise<number> {
  return (await listUsers()).filter((user) => user.role === 'owner').length
}

export function publicUser(user: AdminUser) {
  return {
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt ?? null,
  }
}