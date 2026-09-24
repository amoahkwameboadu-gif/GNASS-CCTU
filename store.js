/* ==========================================================================
   Durable storage for the Vercel functions.

   • Text content (message, events, reels) → Vercel KV / Upstash Redis over REST
   • Uploaded media                        → Vercel Blob

   Configure one of these storage options on the Vercel project and the admin
   portal publishes for every visitor:
     KV_REST_API_URL + KV_REST_API_TOKEN            (Vercel KV)
     UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (Upstash direct)
     BLOB_READ_WRITE_TOKEN                          (Vercel Blob, for uploads)
     GNAAS_ADMIN_TOKEN                              (optional write password)
   ========================================================================== */
import { buildSeedContent, normalizeContent } from './seed.js';

const CONTENT_KEY = 'gnaas:content';
const SEEDED_KEY = 'gnaas:content:seeded';

function fail(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function kvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
  return { url: url.replace(/\/+$/, ''), token };
}

export const isStorageConfigured = () => Boolean(kvConfig().url && kvConfig().token);
export const isMediaConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export function storageInfo() {
  return {
    storage: isStorageConfigured() ? (process.env.KV_REST_API_URL ? 'vercel-kv' : 'upstash-redis') : 'none',
    media: isMediaConfigured() ? 'vercel-blob' : 'none',
    adminTokenRequired: Boolean(process.env.GNAAS_ADMIN_TOKEN),
  };
}

async function kvCommand(command) {
  const { url, token } = kvConfig();
  if (!url || !token) {
    throw fail(
      'No storage configured. Add a Vercel KV (or Upstash Redis) integration to this project — see README → Backend.',
      503,
    );
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw fail(`Storage error: ${data.error || `HTTP ${response.status}`}`);
  }
  return data.result;
}

/** Reads the content, seeding it the first time so the calendar is never blank. */
export async function getContent() {
  const raw = await kvCommand(['GET', CONTENT_KEY]);
  if (raw) {
    try {
      return normalizeContent(typeof raw === 'string' ? JSON.parse(raw) : raw);
    } catch {
      /* corrupted value — reseed below */
    }
  }

  const seeded = buildSeedContent();
  await setContent(seeded);
  await kvCommand(['SET', SEEDED_KEY, new Date().toISOString()]);
  return seeded;
}

export async function setContent(content) {
  const normalized = normalizeContent(content);
  await kvCommand(['SET', CONTENT_KEY, JSON.stringify(normalized)]);
  return normalized;
}

/** Uploads an image/video to Vercel Blob and returns its public URL. */
export async function uploadMedia(file) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw fail(
      'Media uploads need a Vercel Blob store. Create one on the project and set BLOB_READ_WRITE_TOKEN — see README → Backend.',
      503,
    );
  }
  const safeName = (file.filename || 'upload').replace(/[^\w.-]+/g, '-').slice(-60);
  const pathname = `gnaas/${Date.now()}-${safeName || 'upload'}`;
  const response = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-content-type': file.type || 'application/octet-stream',
      'x-add-random-suffix': '0',
    },
    body: file.data,
  });
  if (!response.ok) {
    throw fail(`Media upload failed (HTTP ${response.status}). Check the Blob store token.`);
  }
  const data = await response.json().catch(() => ({}));
  if (!data.url) throw fail('Media upload did not return a URL.');
  return { url: data.url, type: file.type || 'application/octet-stream' };
}
