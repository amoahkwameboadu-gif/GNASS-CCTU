import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readJSON } from './lib/github-storage'

const CONTENT_PATH = 'data/site-content.json'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const data = await readJSON(CONTENT_PATH, { 
      latestMessage: null, 
      events: [], 
      mediaUpdates: [] 
    })
    return res.status(200).json(data)
  } catch (error: any) {
    console.error('Public content API error:', error)
    return res.status(500).json({ error: error.message || 'Server error' })
  }
}