import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readJSON, writeJSON, type ChapterContent } from '../../lib/github-storage'

const CONTENT_PATH = 'data/site-content.json'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const id = String(req.query.id ?? '')
    if (!id) return res.status(400).json({ error: 'Missing event id.' })

    const content = await readJSON<ChapterContent>(CONTENT_PATH, { latestMessage: null, events: [], mediaUpdates: [] })
    const events = content.events.filter((event) => String(event.id) !== id)
    if (events.length === content.events.length) {
      return res.status(404).json({ error: `No event with id "${id}".` })
    }

    const updated = { ...content, events }
    await writeJSON(CONTENT_PATH, updated, `Delete event ${id}`)
    return res.status(200).json(updated)
  } catch (error) {
    console.error('Admin event deletion error:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Server error' })
  }
}
