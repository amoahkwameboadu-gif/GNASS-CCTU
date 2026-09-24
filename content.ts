/* ==========================================================================
   Chapter content API
   Mirrors the original Vercel endpoints used by script.js and admin.js:
     GET    /api/content                    (public site, polled every 30s)
     GET    /api/admin/content              (admin dashboard)
     PUT    /api/admin/content              (save latest message)
     POST   /api/admin/media                (upload image / video)
     POST   /api/admin/media-updates        (publish reel)
     DELETE /api/admin/media-updates/:id
     POST   /api/admin/events               (add calendar event)
     DELETE /api/admin/events/:id

   Reliability rules (this is what makes "update the main site" actually work):
   1. The API is *probed* once with a strict JSON check. Static hosts often answer
      every unknown path with 200 + index.html, which used to look like success.
   2. If the API is unusable, every read and write transparently uses the local
      store instead — including writes that fail mid-session (no data is lost).
   3. The local store is seeded with the site's authored events, so publishing one
      event adds to the calendar instead of replacing everything.
   ========================================================================== */

import { STATIC_EVENTS } from '../data/site';
import { apiUrl, getApiBase, getApiToken } from './apiConfig';
import { getStorageInfo, kvClearAll, kvDelete, kvGet, kvSet, type StorageBackend } from './localStore';

export { getApiBase };

export type LatestMessage = {
  title: string;
  body: string;
  mediaUrl?: string;
  mediaType?: string;
  updatedAt?: string;
};

export type ChapterEvent = {
  id: string;
  title: string;
  description?: string;
  eventDate: string;
  category: string;
};

export type MediaUpdate = {
  id: string;
  title: string;
  body?: string;
  mediaUrl: string;
  mediaType: string;
  createdAt?: string;
};

export type ChapterContent = {
  latestMessage: LatestMessage | null;
  events: ChapterEvent[];
  mediaUpdates: MediaUpdate[];
};

export type ContentMode = 'api' | 'local';

/** Where the admin portal is currently writing, and how durable that is. */
export type ModeInfo = {
  mode: ContentMode;
  backend: StorageBackend;
  /** True when uploads / text cannot survive a page reload. */
  volatile: boolean;
  /** Why the API was rejected (shown in the sync badge tooltip). */
  apiError?: string;
};

const CONTENT_KEY = 'content';
const MEDIA_PREFIX = 'local-media:';
const CHANNEL_NAME = 'gnaas-cctu-content';

export const emptyContent = (): ChapterContent => ({ latestMessage: null, events: [], mediaUpdates: [] });

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function normalize(data: Partial<ChapterContent> | null | undefined): ChapterContent {
  return {
    latestMessage: data?.latestMessage ?? null,
    events: Array.isArray(data?.events) ? data!.events : [],
    mediaUpdates: Array.isArray(data?.mediaUpdates) ? data!.mediaUpdates : [],
  };
}

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

/* ---------- Generic API helper (same behaviour as admin.js `api()`) ---------- */
export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const { headers: optionHeaders, ...rest } = options;
    const headers = new Headers(optionHeaders as HeadersInit | undefined);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    const token = getApiToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(apiUrl(path), {
      credentials: 'same-origin',
      ...rest,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const isJson = (response.headers.get('content-type') || '').toLowerCase().includes('json');
    if (!isJson) {
      // A static host (or an SPA fallback) answered with HTML — not our API.
      throw new Error(`API unavailable: ${path} returned ${response.status} ${response.headers.get('content-type') || 'unknown content type'}`);
    }
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(data.error || `Request failed (HTTP ${response.status})`);
    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Request timed out');
    throw error;
  }
}

/* ---------- API probe (cached, re-runnable) ---------- */
let probePromise: Promise<boolean> | null = null;
let apiError: string | undefined;

async function runProbe(): Promise<boolean> {
  try {
    const response = await fetch(apiUrl('content'), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('json')) throw new Error(`not JSON (${contentType || 'unknown'})`);
    const data = await response.json();
    if (!data || typeof data !== 'object') throw new Error('unexpected payload');
    apiError = undefined;
    return true;
  } catch (error) {
    apiError = describeError(error);
    return false;
  }
}

/** Checks whether the chapter API is really usable. Pass force = true to re-check. */
export function probeApi(force = false): Promise<boolean> {
  if (force || !probePromise) probePromise = runProbe();
  return probePromise;
}

/* ==========================================================================
   Local store (fallback path)
   ========================================================================== */

async function readStoredContent(): Promise<ChapterContent | null> {
  try {
    const stored = await kvGet<ChapterContent>(CONTENT_KEY);
    return stored ? normalize(stored) : null;
  } catch {
    return null;
  }
}

async function writeStoredContent(content: ChapterContent, notify = true): Promise<ChapterContent> {
  await kvSet(CONTENT_KEY, content);
  if (notify) notifyContentChanged();
  return content;
}

async function updateStored(mutator: (content: ChapterContent) => ChapterContent): Promise<ChapterContent> {
  const current = (await readStoredContent()) ?? seedContent();
  return writeStoredContent(mutator(current));
}

/** The authored events act as the store's starting point (as if already in the DB). */
function seedContent(): ChapterContent {
  return {
    latestMessage: null,
    events: STATIC_EVENTS.map((event) => ({ ...event, id: `seed-${event.id}` })),
    mediaUpdates: [],
  };
}

// Guards the *seeding write* only — never the read. Caching the reading result
// here meant the public site kept serving the content from its first load, so
// updates published in the admin portal never showed up until a full reload.
let seedPromise: Promise<unknown> | null = null;

/** Reads local content, creating the seeded version the first time. */
async function ensureStoredContent(): Promise<ChapterContent> {
  const existing = await readStoredContent();
  if (existing) return existing; // always a fresh read → admin updates appear

  if (!seedPromise) {
    seedPromise = writeStoredContent(seedContent(), false).catch(() => undefined);
  }
  await seedPromise;

  return (await readStoredContent()) ?? seedContent();
}

/* Object URLs for locally stored media are cached so polling never reloads videos. */
const objectUrlCache = new Map<string, string>();

/**
 * Uploaded media is stored as raw bytes ({ bytes, type }) rather than as a File
 * object: ArrayBuffers are supported by every IndexedDB implementation, while
 * Blob/File storage has historic quirks in some browsers.
 */
export type StoredMedia = { __media: true; type: string; bytes: ArrayBuffer };

const toStoredMedia = async (file: File): Promise<StoredMedia> => ({
  __media: true,
  type: file.type || 'application/octet-stream',
  bytes: await file.arrayBuffer(),
});

export async function resolveMediaUrl(url?: string): Promise<string | undefined> {
  if (!url || !url.startsWith(MEDIA_PREFIX)) return url;
  const cached = objectUrlCache.get(url);
  if (cached) return cached;
  try {
    const stored = await kvGet<StoredMedia | Blob>(url);
    if (!stored) return undefined;

    let blob: Blob;
    if (typeof Blob !== 'undefined' && stored instanceof Blob) {
      blob = stored; // backwards compatible with raw File/Blob records
    } else if ('bytes' in (stored as StoredMedia) && (stored as StoredMedia).bytes) {
      const record = stored as StoredMedia;
      blob = new Blob([record.bytes], { type: record.type });
    } else {
      return undefined;
    }

    if (typeof URL.createObjectURL !== 'function') return undefined;
    const objectUrl = URL.createObjectURL(blob);
    objectUrlCache.set(url, objectUrl);
    return objectUrl;
  } catch {
    return undefined;
  }
}

async function resolveContentMedia(content: ChapterContent): Promise<ChapterContent> {
  const latestMessage = content.latestMessage
    ? { ...content.latestMessage, mediaUrl: await resolveMediaUrl(content.latestMessage.mediaUrl) }
    : null;
  const mediaUpdates = (
    await Promise.all(content.mediaUpdates.map(async (u) => ({ ...u, mediaUrl: (await resolveMediaUrl(u.mediaUrl)) ?? '' })))
  ).filter((u) => u.mediaUrl);
  return { ...content, latestMessage, mediaUpdates };
}

/* ---------- Cross-tab notifications (admin tab -> public site tab) ---------- */
function notifyContentChanged() {
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage('changed');
    channel.close();
  } catch {
    /* ignore */
  }
}

export function subscribeToContentChanges(callback: () => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => callback();
    return () => channel.close();
  } catch {
    return () => {};
  }
}

/* ==========================================================================
   Public site
   ========================================================================== */

/**
 * A brand-new backend starts empty. Showing the authored calendar keeps the
 * site looking complete until the chapter publishes its first event.
 */
function withAuthoredFallback(content: ChapterContent): ChapterContent {
  const empty = !content.latestMessage && content.events.length === 0 && content.mediaUpdates.length === 0;
  return empty ? { ...content, events: STATIC_EVENTS.map((event) => ({ ...event })) } : content;
}

/** Fetches the latest content: live API first, then the local store. */
export async function fetchPublicContent(): Promise<ChapterContent | null> {
  if (await probeApi()) {
    try {
      const response = await fetch(apiUrl('content'), { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data === 'object') return withAuthoredFallback(normalize(data));
      }
    } catch {
      /* fall through to local content */
    }
  }

  const local = await ensureStoredContent();
  return resolveContentMedia(local);
}

/* ---------- Backend health (used by the admin Backend panel) ---------- */
export type HealthInfo = {
  ok: boolean;
  runtime?: string;
  storage?: string;
  media?: string;
  dataDir?: string;
  uploads?: number;
  events?: number;
  mediaUpdates?: number;
  hasLatestMessage?: boolean;
  adminTokenRequired?: boolean;
  distServed?: boolean;
  at?: string;
  error?: string;
};

/** Reads GET /api/health. Returns null when the backend has no health route. */
export async function fetchHealth(): Promise<HealthInfo | null> {
  try {
    const response = await fetch(apiUrl('health'), {
      headers: { Accept: 'application/json', ...(getApiToken() ? { Authorization: `Bearer ${getApiToken()}` } : {}) },
      cache: 'no-store',
    });
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('json')) return null;
    const data = (await response.json()) as HealthInfo;
    return { ...data, ok: Boolean(data.ok) && response.ok };
  } catch {
    return null;
  }
}

/* ==========================================================================
   Admin portal
   ========================================================================== */

let adminMode: ContentMode = 'local';

export function getModeInfo(): ModeInfo {
  const { backend, volatile } = getStorageInfo();
  return { mode: adminMode, backend, volatile, apiError };
}

/** Loads the dashboard: real API when available, local store otherwise. */
export async function adminLoadContent(): Promise<{ data: ChapterContent; info: ModeInfo }> {
  if (await probeApi()) {
    try {
      const data = normalize(await api<ChapterContent>('admin/content'));
      adminMode = 'api';
      return { data, info: getModeInfo() };
    } catch (error) {
      apiError = describeError(error);
      probePromise = null; // the API just failed — re-check next time
    }
  }

  adminMode = 'local';
  const data = await ensureStoredContent();
  return { data, info: getModeInfo() };
}

/**
 * Runs an API mutation, degrading to the local store if the API is unavailable
 * so the chapter's content is never lost mid-session.
 */
async function mutate(
  apiCall: () => Promise<ChapterContent>,
  localCall: () => Promise<ChapterContent>,
): Promise<ChapterContent> {
  if (adminMode === 'api') {
    try {
      return normalize(await apiCall());
    } catch (error) {
      apiError = describeError(error);
      probePromise = null;
      adminMode = 'local';
    }
  }
  return localCall();
}

export async function adminUploadMedia(file: File): Promise<{ url: string; type: string }> {
  if (adminMode === 'api') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      return await api<{ url: string; type: string }>('admin/media', { method: 'POST', body: formData });
    } catch (error) {
      apiError = describeError(error);
      probePromise = null;
      adminMode = 'local';
    }
  }
  const key = `${MEDIA_PREFIX}${uid()}`;
  await kvSet(key, await toStoredMedia(file)); // read back through resolveMediaUrl()
  return { url: key, type: file.type };
}

export function adminSaveMessage(payload: {
  title: string;
  body: string;
  mediaUrl?: string;
  mediaType?: string;
}): Promise<ChapterContent> {
  return mutate(
    () =>
      api<ChapterContent>('admin/content', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    () =>
      updateStored((content) => ({
        ...content,
        latestMessage: {
          title: payload.title,
          body: payload.body,
          mediaUrl: payload.mediaUrl ?? content.latestMessage?.mediaUrl,
          mediaType: payload.mediaType ?? content.latestMessage?.mediaType,
          updatedAt: new Date().toISOString(),
        },
      })),
  );
}

export function adminAddMediaUpdate(payload: {
  title: string;
  body: string;
  mediaUrl: string;
  mediaType: string;
}): Promise<ChapterContent> {
  return mutate(
    () =>
      api<ChapterContent>('admin/media-updates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    () =>
      updateStored((content) => ({
        ...content,
        mediaUpdates: [{ id: uid(), createdAt: new Date().toISOString(), ...payload }, ...content.mediaUpdates],
      })),
  );
}

export function adminDeleteMediaUpdate(id: string): Promise<ChapterContent> {
  return mutate(
    () => api<ChapterContent>(`admin/media-updates/${id}`, { method: 'DELETE' }),
    async () => {
      const current = (await readStoredContent()) ?? seedContent();
      const removed = current.mediaUpdates.find((u) => u.id === id);
      if (removed?.mediaUrl.startsWith(MEDIA_PREFIX)) {
        // Free the blob we stored for it
        objectUrlCache.delete(removed.mediaUrl);
        await kvDelete(removed.mediaUrl).catch(() => undefined);
      }
      return writeStoredContent({ ...current, mediaUpdates: current.mediaUpdates.filter((u) => u.id !== id) });
    },
  );
}

export function adminAddEvent(payload: {
  title: string;
  description: string;
  eventDate: string;
  category: string;
}): Promise<ChapterContent> {
  return mutate(
    () =>
      api<ChapterContent>('admin/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    () =>
      updateStored((content) => ({
        ...content,
        events: [...content.events, { id: uid(), ...payload }].sort(
          (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
        ),
      })),
  );
}

export function adminDeleteEvent(id: string): Promise<ChapterContent> {
  return mutate(
    () => api<ChapterContent>(`admin/events/${id}`, { method: 'DELETE' }),
    () => updateStored((content) => ({ ...content, events: content.events.filter((e) => e.id !== id) })),
  );
}

/** Wipes everything this browser stored locally (use to get back to the authored content). */
export async function adminResetLocalContent(): Promise<ChapterContent> {
  await kvClearAll();
  objectUrlCache.clear();
  seedPromise = null;
  probePromise = null;
  adminMode = 'local';
  const seeded = await ensureStoredContent();
  return writeStoredContent(seeded);
}


