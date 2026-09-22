import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readJSON, writeJSON } from '../lib/github-storage'

const CONTENT_PATH = 'data/site-content.json'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (req.method === 'GET') {
      const data = await readJSON(CONTENT_PATH, { latestMessage: null, events: [], mediaUpdates: [] })
      return res.status(200).json(data)
    }

    if (req.method === 'PUT') {
      const { latestMessage, events, mediaUpdates } = req.body
      const current = await readJSON(CONTENT_PATH, { latestMessage: null, events: [], mediaUpdates: [] })
      
      const updated = {
        latestMessage: latestMessage ?? current.latestMessage,
        events: events ?? current.events,
        mediaUpdates: mediaUpdates ?? current.mediaUpdates,
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