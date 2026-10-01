import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readJSON, writeJSON, type ChapterContent } from '../lib/github-storage'
import { requireAdmin } from '../lib/admin-auth'

const CONTENT_PATH = 'data/site-content.json'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!requireAdmin(req, res)) return

  try {
    if (req.method === 'GET') {
      const data = await readJSON(CONTENT_PATH, { 
        latestMessage: null, 
        events: [], 
        mediaUpdates: [] 
      })
      return res.status(200).json(data)
    }

    if (req.method === 'PUT') {
      const body = req.body ?? {}
      const current = await readJSON<ChapterContent>(CONTENT_PATH, { latestMessage: null, events: [], mediaUpdates: [] })
      const latestMessage = body.latestMessage ?? (
        typeof body.title === 'string' && typeof body.body === 'string'
          ? {
              title: body.title.trim(),
              body: body.body.trim(),
              mediaUrl: typeof body.mediaUrl === 'string' && body.mediaUrl ? body.mediaUrl : current.latestMessage?.mediaUrl,
              mediaType: typeof body.mediaType === 'string' && body.mediaType ? body.mediaType : current.latestMessage?.mediaType,
              updatedAt: new Date().toISOString(),
            }
          : current.latestMessage
      )
      if (!latestMessage?.title || !latestMessage?.body) {
        return res.status(400).json({ error: 'Both a title and a body are required.' })
      }

      const updated = {
        ...current,
        latestMessage,
        events: body.events ?? current.events,
        mediaUpdates: body.mediaUpdates ?? current.mediaUpdates,
      }

      await writeJSON(CONTENT_PATH, updated, 'Update site content via admin portal')
      return res.status(200).json(updated)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Admin content API error:', error)
    return res.status(500).json({ error: error.message || 'Server error' })
  }
}