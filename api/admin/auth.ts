import type { VercelRequest, VercelResponse } from '@vercel/node'
import { currentUser } from '../../lib/admin-auth'
import { endSession, sessionConfigured, startSession } from '../../lib/session'
import { passwordProblem } from '../../lib/password'
import {
  authenticate,
  createUser,
  publicUser,
  recordLogin,
  usernameProblem,
} from '../../lib/users'

export function signupAllowed(): boolean {
  const flag = String(process.env.ALLOW_SIGNUP ?? 'true').trim().toLowerCase()
  return flag !== 'false' && flag !== '0' && flag !== 'no'
}

async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    if (req.method === 'GET') {
      const configured = sessionConfigured()
      const session = configured ? currentUser(req) : null
      return res.status(200).json({
        authenticated: Boolean(session),
        configured,
        signupAllowed: signupAllowed(),
        user: session,
      })
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const body = (req.body ?? {}) as {
      action?: string
      username?: string
      password?: string
    }
    const action = String(body.action ?? 'login').toLowerCase()

    if (action === 'logout') {
      endSession(res)
      return res.status(200).json({ ok: true })
    }

    if (!sessionConfigured()) {
      return res.status(503).json({
        error:
          'Admin accounts are not configured yet. Set SESSION_SECRET in Vercel (a long random string), then redeploy.',
      })
    }

    const usernameIssue = usernameProblem(String(body.username ?? ''))
    if (usernameIssue) return res.status(400).json({ error: usernameIssue })

    const passwordIssue = passwordProblem(String(body.password ?? ''))
    if (passwordIssue) return res.status(400).json({ error: passwordIssue })

    if (action === 'register') {
      if (!signupAllowed()) {
        return res.status(403).json({ error: 'New sign-ups are closed. Ask an existing admin for an account.' })
      }
      const created = await createUser(String(body.username), String(body.password))
      await recordLogin(created.id)
      startSession(res, { username: created.username, role: created.role })
      return res.status(201).json({ user: publicUser(created) })
    }

    const user = await authenticate(String(body.username), String(body.password))
    if (!user) {
      return res.status(401).json({ error: 'Incorrect username or password.' })
    }

    await recordLogin(user.id)
    startSession(res, { username: user.username, role: user.role })
    return res.status(200).json({ user: publicUser(user) })
  } catch (error: any) {
    const status = error?.status ?? 500
    if (status === 500) console.error('Admin auth error:', error)
    return res.status(status).json({ error: error?.message || 'Server error' })
  }
}

export default handler
module.exports = handler
module.exports.default = handler