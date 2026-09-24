/* ==========================================================================
   Shared helpers for the Vercel serverless functions in /api.
   (Files/folders starting with "_" are not turned into routes.)
   ========================================================================== */
import { getMultipartBoundary, parseMultipartBody } from './multipart.js';

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB, same limit as the admin UI

export function setCors(res, methods = 'GET,POST,PUT,DELETE,OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

export function handlePreflight(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

/** Reads the raw request body as a Buffer (works for JSON and multipart alike). */
export async function readRawBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return Buffer.from(req.body);
    if (req.body instanceof Uint8Array) return Buffer.from(req.body);
    return Buffer.from(JSON.stringify(req.body)); // already parsed by the runtime
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > MAX_UPLOAD_BYTES + 1024 * 512) throw new Error('Request body too large');
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) && !(req.body instanceof Uint8Array)) {
    return req.body;
  }
  const raw = (await readRawBody(req)).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Request body is not valid JSON');
  }
}

/** Parses the uploaded file from a multipart request. */
export async function readUploadedFile(req) {
  const contentType = req.headers['content-type'] || '';
  const boundary = getMultipartBoundary(contentType);
  if (!boundary) throw new Error('Expected a multipart/form-data upload');
  const raw = await readRawBody(req);
  const { file } = parseMultipartBody(raw, boundary);
  if (!file || !file.data?.length) throw new Error('No file was received');
  if (file.data.length > MAX_UPLOAD_BYTES) throw new Error('File too large. Maximum 25 MB.');
  return file;
}

/**
 * Admin writes are protected when the GNAAS_ADMIN_TOKEN environment variable is
 * set. Left unset (the default) the API is open, exactly like the original site.
 */
export function assertAdmin(req) {
  const expected = process.env.GNAAS_ADMIN_TOKEN;
  if (!expected) return;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token !== expected) {
    const error = new Error('Admin token required or incorrect. Add it in the admin portal’s Backend panel.');
    error.statusCode = 401;
    throw error;
  }
}

export function getIdFromUrl(req, prefix) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const rest = url.pathname.slice(prefix.length).replace(/^\//, '');
  return decodeURIComponent(rest.split('/')[0] || '');
}

/** Runs a handler, converting thrown errors into JSON responses. */
export async function run(res, handler) {
  try {
    await handler();
  } catch (error) {
    sendJson(res, error?.statusCode || 500, { error: error?.message || 'Unexpected server error' });
  }
}

export const requireMethod = (req, res, allowed) => {
  if (allowed.includes(req.method)) return true;
  sendJson(res, 405, { error: `Method ${req.method} not allowed. Use ${allowed.join(' or ')}.` });
  return false;
};
