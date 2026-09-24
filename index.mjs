#!/usr/bin/env node
/* ==========================================================================
   GNAAS CCTU CHAPTER — CHAPTER API + STATIC SITE SERVER
   Zero dependencies. Implements the same endpoints as the Vercel functions in
   /api, but stores content in a JSON file on disk and uploads in data/uploads.

   Usage:
     npm run build && node server/index.mjs          → http://localhost:4173
     PORT=8080 GNAAS_ADMIN_TOKEN=secret node server/index.mjs

   Environment variables:
     PORT                port to listen on                     (default 4173)
     HOST                interface to bind                     (default 0.0.0.0)
     GNAAS_DATA_DIR      where content.json + uploads live     (default ./data)
     GNAAS_DIST_DIR      the built site to serve               (default ./dist)
     GNAAS_ADMIN_TOKEN   optional password for /api/admin/*    (default none)
   ========================================================================== */
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getMultipartBoundary, parseMultipartBody } from '../api/_lib/multipart.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DATA_DIR = process.env.GNAAS_DATA_DIR ? path.resolve(process.env.GNAAS_DATA_DIR) : path.join(ROOT, 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DIST_DIR = process.env.GNAAS_DIST_DIR ? path.resolve(process.env.GNAAS_DIST_DIR) : path.join(ROOT, 'dist');
const SEED_FILE = path.join(HERE, 'seed.json');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_TOKEN = process.env.GNAAS_ADMIN_TOKEN || '';
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const EXT_FOR_TYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

/* ==========================================================================
   Content store (single JSON file, written atomically)
   ========================================================================== */
let content = null;
let writeChain = Promise.resolve();

const pad2 = (value) => String(value).padStart(2, '0');

function buildSeed() {
  let seed = { events: [] };
  try {
    seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  } catch (error) {
    console.warn(`! Could not read ${SEED_FILE}: ${error.message}`);
  }
  const year = new Date().getFullYear();
  return {
    latestMessage: seed.latestMessage ?? null,
    events: (seed.events ?? [])
      .map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description ?? '',
        category: event.category ?? 'worship',
        eventDate: event.eventDate ?? `${year}-${pad2(event.month + 1)}-${pad2(event.day)}T09:00`,
      }))
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()),
    mediaUpdates: [],
  };
}

function normalize(data) {
  return {
    latestMessage: data?.latestMessage ?? null,
    events: Array.isArray(data?.events) ? data.events : [],
    mediaUpdates: Array.isArray(data?.mediaUpdates) ? data.mediaUpdates : [],
  };
}

async function loadContent() {
  try {
    const raw = JSON.parse(await fsp.readFile(CONTENT_FILE, 'utf8'));
    return normalize(raw);
  } catch {
    const seeded = buildSeed();
    await persist(seeded);
    console.log(`• Seeded ${seeded.events.length} calendar events into ${CONTENT_FILE}`);
    return seeded;
  }
}

async function persist(next) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${CONTENT_FILE}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`);
  await fsp.rename(tmp, CONTENT_FILE);
}

/** Serialises every mutation so two quick saves can never clobber each other. */
function mutate(change) {
  writeChain = writeChain.then(async () => {
    content = normalize(change(content));
    await persist(content);
  });
  return writeChain.then(() => content);
}

/* ==========================================================================
   HTTP helpers
   ========================================================================== */
function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(res.req?.method === 'HEAD' ? undefined : body);
}

function fail(res, error) {
  sendJson(res, error?.statusCode || 500, { error: error?.message || 'Unexpected server error' });
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_UPLOAD_BYTES + 1024 * 512) throw Object.assign(new Error('Request body too large'), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  const raw = (await readBody(req)).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('Request body is not valid JSON'), { statusCode: 400 });
  }
}

function assertAdmin(req) {
  if (!ADMIN_TOKEN) return;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token !== ADMIN_TOKEN) {
    throw Object.assign(new Error('Admin token required or incorrect. Add it in the admin portal’s Backend panel.'), {
      statusCode: 401,
    });
  }
}

const badRequest = (message) => Object.assign(new Error(message), { statusCode: 400 });

/* ==========================================================================
   API routes
   ========================================================================== */
async function handleApi(req, res, pathname) {
  assertAdminIfNeeded(req, pathname);
  const method = req.method;

  if (pathname === '/api/health' && method === 'GET') {
    const uploads = await countUploads();
    return sendJson(res, 200, {
      ok: true,
      runtime: 'node-server',
      storage: 'json-file',
      media: 'filesystem',
      dataDir: DATA_DIR,
      contentFile: CONTENT_FILE,
      contentFileExists: fs.existsSync(CONTENT_FILE),
      uploads,
      events: content.events.length,
      mediaUpdates: content.mediaUpdates.length,
      hasLatestMessage: Boolean(content.latestMessage),
      adminTokenRequired: Boolean(ADMIN_TOKEN),
      distServed: fs.existsSync(path.join(DIST_DIR, 'index.html')),
      at: new Date().toISOString(),
    });
  }

  if (pathname === '/api/content' && (method === 'GET' || method === 'HEAD')) {
    return sendJson(res, 200, content);
  }

  if (pathname === '/api/admin/content') {
    if (method === 'GET') return sendJson(res, 200, content);
    if (method === 'PUT' || method === 'POST') {
      const body = await readJson(req);
      const title = String(body.title ?? '').trim();
      const text = String(body.body ?? '').trim();
      if (!title || !text) throw badRequest('Both a title and a body are required.');
      const saved = await mutate((current) => ({
        ...current,
        latestMessage: {
          title,
          body: text,
          mediaUrl: body.mediaUrl || current.latestMessage?.mediaUrl,
          mediaType: body.mediaType || current.latestMessage?.mediaType,
          updatedAt: new Date().toISOString(),
        },
      }));
      console.log(`• Latest message published: “${title}”`);
      return sendJson(res, 200, saved);
    }
  }

  if (pathname === '/api/admin/media' && method === 'POST') {
    const boundary = getMultipartBoundary(req.headers['content-type'] || '');
    if (!boundary) throw badRequest('Expected a multipart/form-data upload.');
    const { file } = parseMultipartBody(await readBody(req), boundary);
    if (!file?.data?.length) throw badRequest('No file was received.');
    if (file.data.length > MAX_UPLOAD_BYTES) throw badRequest('File too large. Maximum 25 MB.');
    if (!EXT_FOR_TYPE[file.type]) {
      throw Object.assign(new Error('Unsupported file type. Use JPEG, PNG, WebP, GIF, MP4, WebM, or MOV.'), { statusCode: 415 });
    }

    await fsp.mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}${EXT_FOR_TYPE[file.type]}`;
    await fsp.writeFile(path.join(UPLOAD_DIR, filename), file.data);
    console.log(`• Media uploaded: ${filename} (${(file.data.length / 1024).toFixed(0)} KB)`);
    return sendJson(res, 200, { url: `/api/media/${filename}`, type: file.type });
  }

  const mediaMatch = /^\/api\/media\/(.+)$/.exec(pathname);
  if (mediaMatch && (method === 'GET' || method === 'HEAD')) {
    const name = path.basename(decodeURIComponent(mediaMatch[1]));
    const filePath = path.join(UPLOAD_DIR, name);
    if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
      return sendJson(res, 404, { error: `No uploaded media named "${name}".` });
    }
    return serveFile(req, res, filePath, 'public, max-age=31536000, immutable');
  }

  if (pathname === '/api/admin/media-updates' && method === 'POST') {
    const body = await readJson(req);
    const title = String(body.title ?? '').trim();
    const mediaUrl = String(body.mediaUrl ?? '').trim();
    const mediaType = String(body.mediaType ?? '').trim();
    if (!title || !mediaUrl || !mediaType) throw badRequest('A title, media URL and media type are required.');
    const update = {
      id: `mu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      body: String(body.body ?? ''),
      mediaUrl,
      mediaType,
      createdAt: new Date().toISOString(),
    };
    const saved = await mutate((current) => ({ ...current, mediaUpdates: [update, ...current.mediaUpdates] }));
    console.log(`• Media update published: “${title}”`);
    return sendJson(res, 200, saved);
  }

  const deleteMediaMatch = /^\/api\/admin\/media-updates\/(.+)$/.exec(pathname);
  if (deleteMediaMatch && method === 'DELETE') {
    const id = decodeURIComponent(deleteMediaMatch[1]);
    const removed = content.mediaUpdates.find((update) => update.id === id);
    if (!removed) throw Object.assign(new Error(`No media update with id "${id}".`), { statusCode: 404 });
    const saved = await mutate((current) => ({ ...current, mediaUpdates: current.mediaUpdates.filter((u) => u.id !== id) }));
    // Clean up a locally stored upload so data/uploads never grows forever
    if (removed.mediaUrl.startsWith('/api/media/')) {
      await fsp.rm(path.join(UPLOAD_DIR, path.basename(removed.mediaUrl)), { force: true }).catch(() => {});
    }
    console.log(`• Media update deleted: “${removed.title}”`);
    return sendJson(res, 200, saved);
  }

  if (pathname === '/api/admin/events' && method === 'POST') {
    const body = await readJson(req);
    const title = String(body.title ?? '').trim();
    const eventDate = String(body.eventDate ?? '').trim();
    const category = String(body.category ?? '').trim() || 'worship';
    if (!title || !eventDate) throw badRequest('A title and a date are required.');
    if (Number.isNaN(new Date(eventDate).getTime())) throw badRequest('The event date could not be understood.');
    if (!['worship', 'social', 'outreach', 'sports'].includes(category)) {
      throw badRequest('Category must be one of: worship, social, outreach, sports.');
    }
    const event = {
      id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      description: String(body.description ?? ''),
      eventDate,
      category,
    };
    const saved = await mutate((current) => ({
      ...current,
      events: [...current.events, event].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()),
    }));
    console.log(`• Event added: “${title}” (${eventDate})`);
    return sendJson(res, 200, saved);
  }

  const deleteEventMatch = /^\/api\/admin\/events\/(.+)$/.exec(pathname);
  if (deleteEventMatch && method === 'DELETE') {
    const id = decodeURIComponent(deleteEventMatch[1]);
    const removed = content.events.find((event) => event.id === id);
    if (!removed) throw Object.assign(new Error(`No event with id "${id}".`), { statusCode: 404 });
    const saved = await mutate((current) => ({ ...current, events: current.events.filter((event) => event.id !== id) }));
    console.log(`• Event deleted: “${removed.title}”`);
    return sendJson(res, 200, saved);
  }

  return sendJson(res, 404, { error: `Unknown API route: ${method} ${pathname}` });
}

function assertAdminIfNeeded(req, pathname) {
  if (pathname.startsWith('/api/admin/')) assertAdmin(req);
}

async function countUploads() {
  try {
    return (await fsp.readdir(UPLOAD_DIR)).length;
  } catch {
    return 0;
  }
}

/* ==========================================================================
   Static site (the built dist/)
   ========================================================================== */
async function serveFile(req, res, filePath, cacheControl = 'no-store') {
  const data = await fsp.readFile(filePath);
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': cacheControl,
    'Content-Length': data.length,
  });
  res.end(req.method === 'HEAD' ? undefined : data);
}

async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { error: `Method ${req.method} not allowed.` });
  }

  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let filePath = path.join(DIST_DIR, relative);
  if (!filePath.startsWith(DIST_DIR)) filePath = path.join(DIST_DIR, 'index.html');

  try {
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    await serveFile(req, res, filePath, path.basename(filePath) === 'index.html' ? 'no-store' : 'public, max-age=3600');
    return;
  } catch {
    /* fall through to the SPA fallback below */
  }

  const hasExtension = path.extname(relative) !== '';
  if (!hasExtension) {
    try {
      return await serveFile(req, res, path.join(DIST_DIR, 'index.html'), 'no-store');
    } catch {
      /* dist is missing entirely */
    }
  }

  const body = `<!doctype html><meta charset="utf-8"><title>GNAAS CCTU server</title>
<body style="font-family:system-ui;padding:2rem;line-height:1.6">
<h1>Chapter API is running</h1>
<p>The API is live, but the built website was not found in <code>${DIST_DIR}</code>.</p>
<p>Run <code>npm run build</code> (or <code>npm run dev</code> for development) and reload.</p>
<p>Health check: <a href="/api/health">/api/health</a> · Content feed: <a href="/api/content">/api/content</a></p>
</body>`;
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

/* ==========================================================================
   Server
   ========================================================================== */
const server = http.createServer((req, res) => {
  res.req = req;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname);
  const route = pathname === '/api' || pathname.startsWith('/api/')
    ? handleApi(req, res, pathname)
    : serveStatic(req, res, pathname);

  return route.catch((error) => {
    console.error(`✗ ${req.method} ${pathname} →`, error.message);
    if (!res.headersSent) fail(res, error);
    else res.end();
  });
});

await fsp.mkdir(DATA_DIR, { recursive: true });
content = await loadContent();

server.listen(PORT, HOST, () => {
  const distReady = fs.existsSync(path.join(DIST_DIR, 'index.html'));
  console.log('');
  console.log('  GNAAS CCTU chapter server');
  console.log('  ─────────────────────────────────────────────');
  console.log(`  Site + API      http://localhost:${PORT}`);
  console.log(`  Content feed    http://localhost:${PORT}/api/content`);
  console.log(`  Health check    http://localhost:${PORT}/api/health`);
  console.log(`  Data folder     ${DATA_DIR}`);
  console.log(`  Serving site    ${distReady ? DIST_DIR : `${DIST_DIR} (not built yet — run npm run build)`}`);
  console.log(`  Admin writes    ${ADMIN_TOKEN ? 'protected by GNAAS_ADMIN_TOKEN' : 'open (set GNAAS_ADMIN_TOKEN to protect)'}`);
  console.log('');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\nClosing (${signal})…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
