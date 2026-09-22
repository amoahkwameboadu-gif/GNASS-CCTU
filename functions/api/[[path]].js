const SESSION_COOKIE = 'admin_session';
const SESSION_TTL = 8 * 60 * 60;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_MEDIA = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime'
]);

const json = (data, init = {}) => new Response(JSON.stringify(data), {
  ...init,
  headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) }
});

function cookieValue(request, name) {
  const header = request.headers.get('Cookie') || '';
  const item = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : '';
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verify(value, signature, secret) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const bytes = new Uint8Array(signature.match(/.{2}/g).map((pair) => parseInt(pair, 16)));
  return crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(value));
}

async function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const token = cookieValue(request, SESSION_COOKIE);
  const [expires, signature] = token.split('.');
  if (!expires || !signature || Number(expires) < Math.floor(Date.now() / 1000)) return false;
  return verify(expires, signature, env.ADMIN_PASSWORD);
}

function sessionCookie(value, maxAge) {
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

async function requireAdmin(request, env) {
  if (!(await isAdmin(request, env))) return json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}

async function publicContent(env) {
  const [message, events, mediaUpdates] = await Promise.all([
    env.DB.prepare('SELECT title, body, media_url AS mediaUrl, media_type AS mediaType, updated_at AS updatedAt FROM latest_message WHERE id = 1').first(),
    env.DB.prepare('SELECT id, title, description, event_date AS eventDate, category FROM events ORDER BY event_date ASC').all(),
    env.DB.prepare('SELECT id, title, body, media_url AS mediaUrl, media_type AS mediaType, created_at AS createdAt FROM media_updates ORDER BY created_at DESC LIMIT 30').all()
  ]);
  return { latestMessage: message || null, events: events.results || [], mediaUpdates: mediaUpdates.results || [] };
}

async function handleMedia(request, env, key) {
  const object = await env.MEDIA.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, '');

  try {
    if (request.method === 'GET' && path === 'content') return json(await publicContent(env));
    if (request.method === 'GET' && path.startsWith('media/')) {
      return handleMedia(request, env, decodeURIComponent(path.slice(6)));
    }

    if (path === 'auth/login' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      if (!env.ADMIN_PASSWORD || typeof body.password !== 'string' || body.password !== env.ADMIN_PASSWORD) {
        return json({ error: 'Invalid password' }, { status: 401 });
      }
      const expires = Math.floor(Date.now() / 1000) + SESSION_TTL;
      const token = `${expires}.${await sign(String(expires), env.ADMIN_PASSWORD)}`;
      return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(token, SESSION_TTL) } });
    }
    if (path === 'auth/logout' && request.method === 'POST') {
      return json({ ok: true }, { headers: { 'set-cookie': sessionCookie('', 0) } });
    }

    const authError = await requireAdmin(request, env);
    if (authError) return authError;

    if (path === 'admin/content' && request.method === 'GET') return json(await publicContent(env));
    if (path === 'admin/content' && request.method === 'PUT') {
      const body = await request.json();
      if (!body.title || !body.body) return json({ error: 'Title and body are required' }, { status: 400 });
      await env.DB.prepare(
        `INSERT INTO latest_message (id, title, body, media_url, media_type, updated_at)
         VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET title=excluded.title, body=excluded.body,
         media_url=COALESCE(excluded.media_url, latest_message.media_url),
         media_type=COALESCE(excluded.media_type, latest_message.media_type), updated_at=CURRENT_TIMESTAMP`
      ).bind(String(body.title).slice(0, 180), String(body.body).slice(0, 5000),
        body.mediaUrl ? String(body.mediaUrl).slice(0, 500) : null,
        body.mediaType ? String(body.mediaType).slice(0, 80) : null).run();
      return json(await publicContent(env));
    }
    if (path === 'admin/events' && request.method === 'POST') {
      const body = await request.json();
      if (!body.title || !body.eventDate) return json({ error: 'Title and date are required' }, { status: 400 });
      await env.DB.prepare(
        'INSERT INTO events (title, description, event_date, category) VALUES (?, ?, ?, ?)'
      ).bind(String(body.title).slice(0, 180), String(body.description || '').slice(0, 1000),
        String(body.eventDate).slice(0, 40), String(body.category || 'worship').slice(0, 30)).run();
      return json(await publicContent(env));
    }
    if (path.startsWith('admin/events/') && request.method === 'DELETE') {
      const id = Number(path.slice('admin/events/'.length));
      if (!Number.isInteger(id)) return json({ error: 'Invalid event id' }, { status: 400 });
      await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();
      return json(await publicContent(env));
    }
    if (path === 'admin/media-updates' && request.method === 'GET') return json(await publicContent(env));
    if (path === 'admin/media-updates' && request.method === 'POST') {
      const body = await request.json();
      if (!body.title || !body.mediaUrl || !body.mediaType || !ALLOWED_MEDIA.has(body.mediaType)) {
        return json({ error: 'Title and a valid uploaded image or video are required' }, { status: 400 });
      }
      await env.DB.prepare(
        'INSERT INTO media_updates (title, body, media_url, media_type) VALUES (?, ?, ?, ?)'
      ).bind(String(body.title).slice(0, 180), String(body.body || '').slice(0, 2000),
        String(body.mediaUrl).slice(0, 500), String(body.mediaType)).run();
      return json(await publicContent(env));
    }
    if (path.startsWith('admin/media-updates/') && request.method === 'DELETE') {
      const id = Number(path.slice('admin/media-updates/'.length));
      if (!Number.isInteger(id)) return json({ error: 'Invalid media update id' }, { status: 400 });
      await env.DB.prepare('DELETE FROM media_updates WHERE id = ?').bind(id).run();
      return json(await publicContent(env));
    }
    if (path === 'admin/media' && request.method === 'POST') {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File) || !ALLOWED_MEDIA.has(file.type) || file.size > MAX_UPLOAD_BYTES) {
        return json({ error: 'Unsupported file or file is larger than 25 MB' }, { status: 400 });
      }
      const extension = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
      const key = `uploads/${crypto.randomUUID()}.${extension}`;
      await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
      return json({ url: `/api/media/${encodeURIComponent(key)}`, type: file.type });
    }
    return json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error(error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}
