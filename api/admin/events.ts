import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readJSON, writeJSON, type ChapterContent } from '../lib/github-storage'
import { requireAdmin } from '../lib/admin-auth'

const CONTENT_PATH = 'data/site-content.json'

function generateId(events: Array<{ id: number | string }>): number {
  return events.length > 0 ? Math.max(...events.map((event) => Number(event.id) || 0)) + 1 : 1
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!requireAdmin(req, res)) return

  try {
    const data = await readJSON<ChapterContent>(CONTENT_PATH, { latestMessage: null, events: [], mediaUpdates: [] })
    const events = data.events || []

    if (req.method === 'GET') {
      return res.status(200).json(data)
    }

    if (req.method === 'POST') {
      const { title, description, eventDate, category } = req.body ?? {}
      if (!title || !eventDate) {
        return res.status(400).json({ error: 'Title and date are required' })
      }
      const newEvent = {
        id: generateId(events),
        title: String(title).slice(0, 180),
        description: String(description || '').slice(0, 1000),
        eventDate: String(eventDate).slice(0, 40),
        category: String(category || 'worship').slice(0, 30),
      }
      const updated = { ...data, events: [...events, newEvent] }
      await writeJSON(CONTENT_PATH, updated, `Add event: ${newEvent.title}`)
      return res.status(200).json(updated)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Admin events API error:', error)
    return res.status(500).json({ error: error.message || 'Server error' })
  }
}