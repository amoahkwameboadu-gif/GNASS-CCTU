import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readJSON, writeJSON, type ChapterContent } from '../../lib/github-storage'
import { requireAdmin } from '../../lib/admin-auth'

const CONTENT_PATH = 'data/site-content.json'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!requireAdmin(req, res)) return
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const id = String(req.query.id ?? '')
    if (!id) return res.status(400).json({ error: 'Missing media update id.' })

    const content = await readJSON<ChapterContent>(CONTENT_PATH, { latestMessage: null, events: [], mediaUpdates: [] })
    const mediaUpdates = content.mediaUpdates.filter((update) => String(update.id) !== id)
    if (mediaUpdates.length === content.mediaUpdates.length) {
      return res.status(404).json({ error: `No media update with id "${id}".` })
    }

    const updated = { ...content, mediaUpdates }
    await writeJSON(CONTENT_PATH, updated, `Delete media update ${id}`)
    return res.status(200).json(updated)
  } catch (error) {
    console.error('Admin media update deletion error:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Server error' })
  }
}
