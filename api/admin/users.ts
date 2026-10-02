import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin, currentUser } from '../lib/admin-auth'
import { passwordProblem } from '../lib/password'
import {
  countOwners,
  createUser,
  findUser,
  listUsers,
  publicUser,
  removeUser,
  usernameProblem,
  type AdminRole,
} from '../lib/users'

async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!(await requireAdmin(req, res))) return

  const session = currentUser(req)

  try {
    if (req.method === 'GET') {
      const users = await listUsers()
      return res.status(200).json({ users: users.map(publicUser) })
    }

    if (req.method === 'POST') {
      const body = (req.body ?? {}) as { username?: string; password?: string; role?: string }
      const usernameIssue = usernameProblem(String(body.username ?? ''))
      if (usernameIssue) return res.status(400).json({ error: usernameIssue })

      const passwordIssue = passwordProblem(String(body.password ?? ''))
      if (passwordIssue) return res.status(400).json({ error: passwordIssue })

      const role: AdminRole = body.role === 'owner' ? 'owner' : 'editor'
      const created = await createUser(String(body.username), String(body.password), role)
      return res.status(201).json({ user: publicUser(created) })
    }

    if (req.method === 'DELETE') {
      const username = String(req.query?.username ?? '')
      const target = await findUser(username)
      if (!target) return res.status(404).json({ error: 'No such account.' })
      if (session && target.username === session.username) {
        return res.status(400).json({ error: 'You cannot remove your own account while signed in.' })
      }
      if (target.role === 'owner' && (await countOwners()) <= 1) {
        return res.status(400).json({ error: 'Keep at least one owner account.' })
      }
      await removeUser(username)
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    const status = error?.status ?? 500
    if (status === 500) console.error('Admin users error:', error)
    return res.status(status).json({ error: error?.message || 'Server error' })
  }
}

export default handler
module.exports = handler
module.exports.default = handler