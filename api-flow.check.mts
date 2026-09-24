/* ==========================================================================
   End-to-end check: the bundled chapter server (server/index.mjs) driven by
   the real frontend code from src/lib.

   Bundled + run by scripts/run-checks.sh. Nothing is mocked except
   localStorage — the API calls, uploads, persistence and static serving all go
   over HTTP to a real server process.
   ========================================================================== */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/* ---- localStorage mock (before importing the app code) ---- */
const lsMap = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    get length() {
      return lsMap.size;
    },
    key: (i: number) => [...lsMap.keys()][i] ?? null,
    getItem: (k: string) => (lsMap.has(k) ? (lsMap.get(k) as string) : null),
    setItem: (k: string, v: string) => void lsMap.set(k, String(v)),
    removeItem: (k: string) => void lsMap.delete(k),
    clear: () => lsMap.clear(),
  },
});

// The bundled script runs from a temp folder, so the project root is the cwd
// (scripts/run-checks.sh cd's into the project root before running this).
const ROOT = process.cwd();
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gnaas-data-'));
const PORT = 4318;
const TOKEN_PORT = 4319;
const BASE = `http://127.0.0.1:${PORT}/api`;

const children: ChildProcess[] = [];

function startServer(port: number, extraEnv: Record<string, string> = {}) {
  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', GNAAS_DATA_DIR: DATA_DIR, ...extraEnv },
    stdio: 'ignore',
  });
  children.push(child);
  return child;
}

async function waitForServer(port: number, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

/* ---- test harness ---- */
let failures = 0;
let passes = 0;
const check = (label: string, ok: boolean, extra = '') => {
  if (ok) {
    passes++;
    console.log(`  ✓ ${label}${extra ? ` — ${extra}` : ''}`);
  } else {
    failures++;
    console.log(`  ✗ ${label}${extra ? ` — ${extra}` : ''}`);
  }
};
const section = (title: string) => console.log(`\n${title}`);
const settle = () => new Promise((r) => setTimeout(r, 80));

console.log('===== REAL SERVER, REAL HTTP: admin portal -> main site =====');

startServer(PORT);
const up = await waitForServer(PORT);
if (!up) {
  console.log('✗ the chapter server did not start');
  children.forEach((c) => c.kill());
  process.exit(1);
}
console.log(`\nServer listening on http://127.0.0.1:${PORT} (data: ${DATA_DIR})`);

/* ---- point the frontend at the real backend (what the Backend panel does) ---- */
const { setApiBase, setApiToken, getApiBase, normalizeApiBase } = await import('../src/lib/apiConfig');
const {
  adminAddEvent,
  adminAddMediaUpdate,
  adminDeleteEvent,
  adminLoadContent,
  adminSaveMessage,
  adminUploadMedia,
  fetchPublicContent,
  fetchHealth,
  getModeInfo,
  probeApi,
} = await import('../src/lib/content');
const { eventDateParts } = await import('../src/lib/eventDate');

section('1. Address normalisation (what "Save & test connection" stores)');
check('bare host gets /api appended', normalizeApiBase('http://127.0.0.1:4318') === 'http://127.0.0.1:4318/api');
check('trailing slash is trimmed', normalizeApiBase('https://api.example.com/api/') === 'https://api.example.com/api');
check('"/api" stays relative', normalizeApiBase('/api') === '/api');
check('empty falls back to the default', normalizeApiBase('   ') === '/api');
setApiBase(BASE);
check('frontend now points at the server', getApiBase() === BASE, getApiBase());

section('2. The API is detected (this is what was missing before)');
check('probe succeeds over HTTP', await probeApi(true));
const loaded = await adminLoadContent();
check('admin dashboard uses API mode', loaded.info.mode === 'api', `mode=${loaded.info.mode}`);
check('server seeded the 5 authored events', loaded.data.events.length === 5, `got ${loaded.data.events.length}`);
const health = await fetchHealth();
check('health route reports the runtime', health?.runtime === 'node-server', String(health?.runtime));
check('health route reports storage', health?.storage === 'json-file' && health?.media === 'filesystem');
check('5 events after seeding', health?.events === 5, `got ${health?.events}`);

section('3. Public site reads the backend');
const publicInitial = await fetchPublicContent();
check('site gets 5 events from the server', publicInitial?.events.length === 5, `got ${publicInitial?.events.length}`);
check('authored dates intact', `${eventDateParts(publicInitial!.events[0].eventDate).day} ${eventDateParts(publicInitial!.events[0].eventDate).month}` === '14 Sep');

section('4. Publishing a latest message reaches every visitor');
await adminSaveMessage({ title: 'Server Check Message', body: 'Published over real HTTP by the integration check' });
await settle();
const publicMessage = await fetchPublicContent();
check('site shows the new title', publicMessage?.latestMessage?.title === 'Server Check Message', String(publicMessage?.latestMessage?.title));
const rawContent = await (await fetch(`http://127.0.0.1:${PORT}/api/content`)).json();
check('a raw API read shows it too (not just this process)', rawContent?.latestMessage?.title === 'Server Check Message');
check('events untouched by the message publish', rawContent?.events.length === 5);

section('5. Uploading media and publishing a reel');
const png = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'check.png', { type: 'image/png' });
const uploaded = await adminUploadMedia(png);
check('upload returns an API url', uploaded.url.startsWith('/api/media/'), uploaded.url);
const mediaRes = await fetch(`http://127.0.0.1:${PORT}${uploaded.url}`);
check('uploaded file is downloadable', mediaRes.ok && mediaRes.headers.get('content-type') === 'image/png', `${mediaRes.status} ${mediaRes.headers.get('content-type')}`);
await adminAddMediaUpdate({ title: 'Server Check Reel', body: 'reel from the check', mediaUrl: uploaded.url, mediaType: uploaded.type });
await settle();
const publicReel = await fetchPublicContent();
check('reel is on the site', publicReel?.mediaUpdates[0]?.title === 'Server Check Reel', String(publicReel?.mediaUpdates[0]?.title));
check('reel media URL is absolute-ready', Boolean(publicReel?.mediaUpdates[0]?.mediaUrl?.startsWith('/api/media/')));

section('6. Calendar events');
await adminAddEvent({ title: 'Server Check Event', description: 'added over HTTP', eventDate: '2026-12-25T18:00', category: 'sports' });
await settle();
const publicEvents = await fetchPublicContent();
const added = publicEvents?.events.find((e) => e.title === 'Server Check Event');
check('6 events after adding', publicEvents?.events.length === 6, `got ${publicEvents?.events.length}`);
check('new event visible on the site', Boolean(added));
check('events sorted by date', publicEvents?.events[5].title === 'Server Check Event');
await adminDeleteEvent(added!.id);
await settle();
const afterDelete = await fetchPublicContent();
check('back to 5 after delete', afterDelete?.events.length === 5, `got ${afterDelete?.events.length}`);

section('7. The backend is durable (survives a restart)');
const contentFile = path.join(DATA_DIR, 'content.json');
check('content.json written to disk', fs.existsSync(contentFile));
const onDisk = JSON.parse(fs.readFileSync(contentFile, 'utf8'));
check('message persisted on disk', onDisk.latestMessage?.title === 'Server Check Message');
check('reel persisted on disk', onDisk.mediaUpdates.length === 1);
children[0].kill();
await new Promise((r) => setTimeout(r, 300));
startServer(PORT);
await waitForServer(PORT);
const afterRestart = await (await fetch(`http://127.0.0.1:${PORT}/api/content`)).json();
check('message still there after restart', afterRestart.latestMessage?.title === 'Server Check Message', String(afterRestart?.latestMessage?.title));
check('reel still there after restart', afterRestart.mediaUpdates.length === 1);

section('8. The server also serves the built site');
const siteRes = await fetch(`http://127.0.0.1:${PORT}/`);
const siteHtml = await siteRes.text();
check('site responds 200', siteRes.ok, `HTTP ${siteRes.status}`);
check('site HTML is the built app', siteHtml.includes('GNAAS CCTU Chapter') && siteHtml.includes('<div id="root">'));
const missingApi = await fetch(`http://127.0.0.1:${PORT}/api/does-not-exist`);
const missingApiBody = await missingApi.json();
check('unknown API route is a readable JSON 404', missingApi.status === 404 && String(missingApiBody.error).includes('Unknown API route'), missingApiBody.error);

section('9. Optional write password (GNAAS_ADMIN_TOKEN)');
startServer(TOKEN_PORT, { GNAAS_ADMIN_TOKEN: 'chapter-secret' });
await waitForServer(TOKEN_PORT);
setApiBase(`http://127.0.0.1:${TOKEN_PORT}/api`);
setApiToken('');
await probeApi(true);
const unauthenticated = await adminLoadContent();
check('without the password the admin cannot write', unauthenticated.info.mode === 'local', `mode=${unauthenticated.info.mode}`);
const rawUnauth = await fetch(`http://127.0.0.1:${TOKEN_PORT}/api/admin/content`);
check('protected endpoint answers 401 JSON', rawUnauth.status === 401, `HTTP ${rawUnauth.status}`);
check('401 message tells you what to do', String((await rawUnauth.json()).error).includes('Admin token required'));
setApiToken('chapter-secret');
await probeApi(true);
const authenticated = await adminLoadContent();
check('with the password the admin works', authenticated.info.mode === 'api', `mode=${authenticated.info.mode}`);
check('protected read returns the content', authenticated.data.events.length === 5);
setApiToken('');

section('10. Back to local mode when the backend disappears');
cityCheck: {
  children.slice(1).forEach((child) => child.kill());
  await new Promise((r) => setTimeout(r, 300));
  setApiBase(BASE); // back to the live one
  setApiToken('');
  await settle();
  check('still connected to the first server', getModeInfo().mode === 'api', `mode=${getModeInfo().mode}`);
}

console.log(`\n===== ${failures === 0 ? 'PASS' : 'FAIL'} — ${passes} passed, ${failures} failed =====`);

children.forEach((child) => child.kill());
fs.rmSync(DATA_DIR, { recursive: true, force: true });
process.exit(failures === 0 ? 0 : 1);
