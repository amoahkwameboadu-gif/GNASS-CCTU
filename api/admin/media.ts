import { randomUUID } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { publicFileUrl, writeBinaryFile } from '../lib/github-storage'

const ALLOWED_MEDIA = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime'
])
const MEDIA_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}
const MAX_SIZE = 4 * 1024 * 1024 // keep multipart requests below Vercel's body limit

export const config = { api: { bodyParser: false } }

class UploadTooLargeError extends Error {}

async function readUpload(req: VercelRequest): Promise<{ type: string; data: Buffer } | null> {
  const contentType = req.headers['content-type'] || ''
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.slice(1).find(Boolean)?.trim()
  if (!boundary) return null

  const chunks: Buffer[] = []
  let totalSize = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    totalSize += buffer.length
    if (totalSize > MAX_SIZE + 128 * 1024) {
      throw new UploadTooLargeError('Upload is too large. Maximum file size is 4 MB.')
    }
    chunks.push(buffer)
  }

  const parts = Buffer.concat(chunks).toString('latin1').split(`--${boundary}`)
  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n')
    if (headerEnd < 0) continue
    const headers = part.slice(0, headerEnd)
    if (!/content-disposition:[^\r\n]*\bname="file"/i.test(headers)) continue

    const payload = part.slice(headerEnd + 4).replace(/\r\n$/, '')
    const type = headers.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim()
    if (!type) return null
    return { type, data: Buffer.from(payload, 'latin1') }
  }
  return null
}

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
    const file = await readUpload(req)
    if (!file) {
      return res.status(400).json({ error: 'No valid file was provided in the "file" upload field.' })
    }

    const mimeType = file.type
    if (!mimeType || !ALLOWED_MEDIA.has(mimeType)) {
      return res.status(400).json({ error: 'Unsupported file type' })
    }

    if (file.data.length > MAX_SIZE) {
      return res.status(400).json({ error: 'File is larger than 4 MB' })
    }

    const fileName = `${randomUUID()}.${MEDIA_EXTENSIONS[mimeType]}`
    const path = `uploads/${fileName}`
    await writeBinaryFile(path, file.data, `Upload chapter media ${fileName}`)
    return res.status(200).json({ url: publicFileUrl(path), type: mimeType })
  } catch (error: any) {
    console.error('Admin media upload error:', error)
    const status = error instanceof UploadTooLargeError ? 413 : 500
    return res.status(status).json({ error: error instanceof Error ? error.message : 'Upload failed' })
  }
}