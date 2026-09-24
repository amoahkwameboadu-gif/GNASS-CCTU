import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readJSON, writeJSON } from '../../lib/github-storage'

const CONTENT_PATH = 'data/site-content.json'
const ALLOWED_MEDIA = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime'
])
const MAX_SIZE = 25 * 1024 * 1024 // 25 MB

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Vercel provides body as parsed form data when using multipart
    const formData = req.body as any
    const file = formData?.file
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    // Check file type
    const mimeType = file.type || file.mimetype
    if (!mimeType || !ALLOWED_MEDIA.has(mimeType)) {
      return res.status(400).json({ error: 'Unsupported file type' })
    }

    // Check file size (Vercel parses as base64 string)
    const base64Data = file.data || file.buffer
    if (!base64Data) {
      return res.status(400).json({ error: 'Invalid file data' })
    }
    
    const size = Buffer.from(base64Data, 'base64').length
    if (size > MAX_SIZE) {
      return res.status(400).json({ error: 'File is larger than 25 MB' })
    }

    // Store as base64 data URL (for demo; in production use Vercel Blob or external storage)
    const dataUrl = `data:${mimeType};base64,${base64Data}`
    
    return res.status(200).json({ url: dataUrl, type: mimeType })
  } catch (error: any) {
    console.error('Admin media upload error:', error)
    return res.status(500).json({ error: error.message || 'Server error' })
  }
}