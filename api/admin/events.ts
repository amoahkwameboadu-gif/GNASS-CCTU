import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readJSON, writeJSON } from '../lib/github-storage'

const CONTENT_PATH = 'data/site-content.json'

function generateId(events: any[]): number {
  return events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const data = await readJSON(CONTENT_PATH, { latestMessage: null, events: [], mediaUpdates: [] })
    const events = data.events || []

    if (req.method === 'GET') {
      return res.status(200).json(events)
    }

    if (req.method === 'POST') {
      const { title, description, eventDate, category } = req.body
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
      const updatedEvents = [...events, newEvent]
      await writeJSON(CONTENT_PATH, { ...data, events: updatedEvents }, `Add event: ${newEvent.title}`)
      return res.status(200).json(updatedEvents)
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url!, `http://${req.headers.host}`)
      const id = Number(url.pathname.split('/').pop())
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid event id' })
      }
      const updatedEvents = events.filter(e => e.id !== id)
      await writeJSON(CONTENT_PATH, { ...data, events: updatedEvents }, `Delete event ${id}`)
      return res.status(200).json(updatedEvents)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Admin events API error:', error)
    return res.status(500).json({ error: error.message || 'Server error' })
  }
}