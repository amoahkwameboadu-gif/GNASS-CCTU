import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readJSON, writeJSON, type ChapterContent } from '../../lib/github-storage'
import { requireAdmin } from '../../lib/admin-auth'

const CONTENT_PATH = 'data/site-content.json'
const ALLOWED_MEDIA = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime'
])

function generateId(updates: Array<{ id: number | string }>): number {
  return updates.length > 0 ? Math.max(...updates.map((update) => Number(update.id) || 0)) + 1 : 1
}

async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!(await requireAdmin(req, res))) return

  try {
    const data = await readJSON<ChapterContent>(CONTENT_PATH, { latestMessage: null, events: [], mediaUpdates: [] })
    const mediaUpdates = data.mediaUpdates || []

    if (req.method === 'GET') {
      return res.status(200).json(data)
    }

    if (req.method === 'POST') {
      const { title, body, mediaUrl, mediaType } = req.body ?? {}
      if (!title || !mediaUrl || !mediaType || !ALLOWED_MEDIA.has(mediaType)) {
        return res.status(400).json({ error: 'Title and a valid image or video are required' })
      }
      const newUpdate = {
        id: generateId(mediaUpdates),
        title: String(title).slice(0, 180),
        body: String(body || '').slice(0, 2000),
        mediaUrl: String(mediaUrl).slice(0, 500),
        mediaType: String(mediaType),
        createdAt: new Date().toISOString(),
      }
      const updated = { ...data, mediaUpdates: [...mediaUpdates, newUpdate] }
      await writeJSON(CONTENT_PATH, updated, `Publish media update: ${newUpdate.title}`)
      return res.status(200).json(updated)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Admin media-updates API error:', error)
    return res.status(500).json({ error: error.message || 'Server error' })
  }
}
export default handler
module.exports = handler
module.exports.default = handler

