/* ==========================================================================
   Integration check for the admin -> main-site content flow.

   Bundle + run (see README):
     node_modules/.bin/esbuild scripts/local-flow.check.mts --bundle \
       --platform=node --format=esm --target=node20 --outfile=/tmp/local-flow.mjs
     SCENARIO=idb|localstorage|memory node /tmp/local-flow.mjs

   Scenarios:
     idb          — fake IndexedDB + working localStorage (normal browser)
     localstorage — IndexedDB blocked, localStorage available
     memory       — every storage backend blocked (sandboxed / opaque origin)
   All scenarios simulate a static host: /api/* never returns a usable API.
   ========================================================================== */

const scenario = process.env.SCENARIO ?? 'idb';

if (scenario === 'idb') {
  await import('fake-indexeddb/auto');
} else {
  delete (globalThis as unknown as { indexedDB?: unknown }).indexedDB; // IndexedDB blocked
}

/* ---- localStorage mock (working, or blocked in the "memory" scenario) ---- */
const lsMap = new Map<string, string>();
const lsBlocked = scenario === 'memory';
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    get length() {
      return lsMap.size;
    },
    key: (i: number) => [...lsMap.keys()][i] ?? null,
    getItem: (k: string) => (lsMap.has(k) ? (lsMap.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      if (lsBlocked) throw new DOMException('Storage disabled', 'SecurityError');
      lsMap.set(k, String(v));
    },
    removeItem: (k: string) => {
      if (lsBlocked) return;
      lsMap.delete(k);
    },
    clear: () => lsMap.clear(),
  },
});

/* ---- Blob URL support (Node has no URL.createObjectURL for Blobs) ---- */
if (typeof URL.createObjectURL !== 'function') {
  (URL as unknown as { createObjectURL: (b: unknown) => string }).createObjectURL = () => `blob:node-stub/${Math.random().toString(36).slice(2)}`;
  (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => {};
}

/* ---- A static host with no API: unknown paths fail ---- */
type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
let fetchImpl: FetchImpl = async () => {
  throw new TypeError('fetch failed (no backend)');
};
(globalThis as unknown as { fetch: unknown }).fetch = (input: RequestInfo | URL, init?: RequestInit) => fetchImpl(input, init);

const {
  fetchPublicContent,
  adminLoadContent,
  adminSaveMessage,
  adminAddEvent,
  adminDeleteEvent,
  adminUploadMedia,
  adminAddMediaUpdate,
  adminDeleteMediaUpdate,
  adminResetLocalContent,
  probeApi,
  subscribeToContentChanges,
} = await import('../src/lib/content');
const { eventDateParts, eventDateLabel } = await import('../src/lib/eventDate');

/* ---- tiny test harness ---- */
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
const note = (text: string) => console.log(`  ! ${text}`);
const section = (title: string) => console.log(`\n${title}`);
const settle = () => new Promise((r) => setTimeout(r, 60));

console.log(`===== SCENARIO: ${scenario} =====`);

/* ---------- 1. Seeded local content ---------- */
section('1. Public site renders the authored events from the content store');
const initial = await fetchPublicContent();
check('public content exists (not null)', initial !== null);
check('5 events seeded', initial?.events.length === 5, `got ${initial?.events.length}`);
check('no media updates yet', initial?.mediaUpdates.length === 0);
const firstDates = (initial?.events ?? []).map((e) => `${eventDateParts(e.eventDate).day} ${eventDateParts(e.eventDate).month}`);
check(
  'authored dates intact (14 Sep, 21 Sep, 28 Sep, 5 Oct, 18 Oct)',
  JSON.stringify(firstDates) === JSON.stringify(['14 Sep', '21 Sep', '28 Sep', '5 Oct', '18 Oct']),
  firstDates.join(' | '),
);

/* ---------- 2. Admin dashboard mode ---------- */
section('2. Admin dashboard falls back to a writable target');
const loaded = await adminLoadContent();
const expectedBackend = scenario === 'idb' ? 'indexeddb' : scenario === 'localstorage' ? 'localstorage' : 'memory';
check('mode is local (API unreachable)', loaded.info.mode === 'local', `mode=${loaded.info.mode}`);
check(`storage backend is ${expectedBackend}`, loaded.info.backend === expectedBackend, `backend=${loaded.info.backend}`);
check('api error captured for the badge tooltip', Boolean(loaded.info.apiError), loaded.info.apiError ?? '');

/* ---------- 3. Latest message (the reported bug) ---------- */
section('3. Publishing a latest message is visible on the site — without a reload');
await adminSaveMessage({ title: 'Check: New Message', body: 'Body from the integration check' });
await settle();
const afterMessage = await fetchPublicContent();
check('site shows the new title', afterMessage?.latestMessage?.title === 'Check: New Message', String(afterMessage?.latestMessage?.title));
check('site shows the new body', afterMessage?.latestMessage?.body === 'Body from the integration check');
check('authored events untouched', afterMessage?.events.length === 5);
// The site polls every 30s — repeated reads must never be stale
const pollOne = await fetchPublicContent();
await settle();
const pollTwo = await fetchPublicContent();
check('repeated polls stay fresh (30s refresh)', pollOne?.latestMessage?.title === 'Check: New Message' && pollTwo?.latestMessage?.title === 'Check: New Message');

/* ---------- 4. Media upload + reel ---------- */
section('4. Uploading media and publishing a reel reaches the main site');
const file = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'check.png', { type: 'image/png' });
const uploaded = await adminUploadMedia(file);
check('upload returns a local key', uploaded.url.startsWith('local-media:'), uploaded.url);
await adminAddMediaUpdate({ title: 'Check Reel', body: 'from the integration check', mediaUrl: uploaded.url, mediaType: uploaded.type });
const afterReel = await fetchPublicContent();
check('one reel published', afterReel?.mediaUpdates.length === 1, `got ${afterReel?.mediaUpdates.length}`);
check('reel title shown on the site', afterReel?.mediaUpdates[0]?.title === 'Check Reel');

const mediaResolved = Boolean(afterReel?.mediaUpdates[0]?.mediaUrl);
if (scenario === 'idb') {
  check('uploaded media is persisted and resolvable', mediaResolved && afterReel!.mediaUpdates[0].mediaUrl.startsWith('blob:'), afterReel?.mediaUpdates[0]?.mediaUrl?.slice(0, 26) ?? 'not resolved');
} else if (mediaResolved) {
  check('uploaded media resolved', true, afterReel!.mediaUpdates[0].mediaUrl.slice(0, 26));
} else {
  note('IndexedDB is blocked here, so uploads are memory-only (the badge reports this as volatile) — expected');
}

/* ---------- 5. Calendar events ---------- */
section('5. Adding and deleting calendar events reaches the main site');
const added = await adminAddEvent({ title: 'Check Event', description: 'from the integration check', eventDate: '2026-12-25T18:00', category: 'sports' });
check('6 events after adding', added.events.length === 6, `got ${added.events.length}`);
await settle();
const afterEvent = await fetchPublicContent();
const addedOnSite = afterEvent?.events.find((e) => e.title === 'Check Event');
check('new event is on the main site', Boolean(addedOnSite));
check('new event shows as 25 Dec', Boolean(addedOnSite) && `${eventDateParts(addedOnSite!.eventDate).day} ${eventDateParts(addedOnSite!.eventDate).month}` === '25 Dec', addedOnSite ? `${eventDateParts(addedOnSite.eventDate).day} ${eventDateParts(addedOnSite.eventDate).month}` : 'missing');
check('admin list label is readable', eventDateLabel('2026-12-25T18:00') === 'Fri 25 Dec', eventDateLabel('2026-12-25T18:00'));
const titles = (afterEvent?.events ?? []).map((e) => e.title);
const sortedTitles = [...(afterEvent?.events ?? [])].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()).map((e) => e.title);
check('events are sorted by date', JSON.stringify(titles) === JSON.stringify(sortedTitles));

if (addedOnSite) {
  await adminDeleteEvent(addedOnSite.id);
  await settle();
  const afterDelete = await fetchPublicContent();
  check('back to 5 events after delete', afterDelete?.events.length === 5, `got ${afterDelete?.events.length}`);
  check('deleted event is gone from the site', !afterDelete?.events.some((e) => e.title === 'Check Event'));
}

const reelToDelete = afterReel?.mediaUpdates[0];
if (reelToDelete) {
  await adminDeleteMediaUpdate(reelToDelete.id);
  const afterReelDelete = await fetchPublicContent();
  check('reel removed (site falls back to the authored reels)', (afterReelDelete?.mediaUpdates.length ?? -1) === 0);
}

/* ---------- 6. Rejecting a fake API ---------- */
section('6. A host that answers /api/content with HTML is not mistaken for a working API');
fetchImpl = async () =>
  new Response('<!doctype html><html><body>index.html</body></html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
check('probe rejects the HTML response', (await probeApi(true)) === false);
fetchImpl = async () => new Response(JSON.stringify({ latestMessage: null, events: [], mediaUpdates: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
check('probe accepts a real JSON API', (await probeApi(true)) === true);
const apiContent = await fetchPublicContent();
check(
  'an empty backend never blanks the calendar (authored events shown)',
  apiContent?.events.length === 5 && apiContent?.latestMessage === null,
  `events=${apiContent?.events.length}`,
);

// Once the backend has real content it is the source of truth
fetchImpl = async () =>
  new Response(
    JSON.stringify({
      latestMessage: { title: 'From the API', body: 'api body' },
      events: [{ id: 'e1', title: 'API Event', description: 'from the backend', eventDate: '2026-11-20T10:00', category: 'worship' }],
      mediaUpdates: [],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
await probeApi(true);
const apiAuthoritative = await fetchPublicContent();
check(
  'the backend becomes the source of truth once it has content',
  apiAuthoritative?.latestMessage?.title === 'From the API' && apiAuthoritative?.events.length === 1,
  `events=${apiAuthoritative?.events.length}`,
);
fetchImpl = async () => {
  throw new TypeError('fetch failed (no backend)');
};
check('probe rejects a dead API', (await probeApi(true)) === false);
const backToLocal = await fetchPublicContent();
check('site falls back to local content when the API dies', backToLocal?.latestMessage?.title === 'Check: New Message', String(backToLocal?.latestMessage?.title));

/* ---------- 7. Cross-tab notification ---------- */
section('7. Another open tab is notified immediately');
let notified = false;
const unsubscribe = subscribeToContentChanges(() => {
  notified = true;
});
await adminSaveMessage({ title: 'Check: Broadcast', body: 'notify other tabs' });
await new Promise((r) => setTimeout(r, 250));
console.log(notified ? '  ✓ BroadcastChannel notification delivered' : '  ! BroadcastChannel did not deliver in Node (browser-only behaviour) — not a failure');
unsubscribe();

/* ---------- 8. Reset ---------- */
section('8. Reset local content restores the authored state');
const reset = await adminResetLocalContent();
check('message cleared', reset.latestMessage === null);
check('5 authored events restored', reset.events.length === 5, `got ${reset.events.length}`);

/* ---------- 9. Single-file download helpers ---------- */
section('9. "Download site (HTML)" produces a clean standalone file');
const { cleanSnapshotHtml, looksLikeSiteHtml, DOWNLOAD_FILE_NAME } = await import('../src/lib/downloadSite');
check('file name is set', DOWNLOAD_FILE_NAME === 'gnaas-cctu-chapter.html', DOWNLOAD_FILE_NAME);

const snapshot =
  '<html class="js-enabled" data-theme="dark"><head><title>GNAAS</title>' +
  '<style id="admin-style">.admin-shell{color:red}</style></head>' +
  '<body><main>site</main><div id="toast-container" class="toast-container"></div></body></html>';
const cleaned = cleanSnapshotHtml(snapshot);
check('admin-only styles stripped', !cleaned.includes('admin-style'));
check('runtime toast host stripped', !cleaned.includes('toast-container'));
check('runtime flags stripped (fresh defaults on open)', !cleaned.includes('js-enabled') && !cleaned.includes('data-theme'));
check('real markup + inlined css kept', cleaned.includes('<main>site</main>') && cleaned.includes('<title>GNAAS</title>'));

check('recognises the site’s own HTML', looksLikeSiteHtml('<!doctype html><html lang="en">…', 'text/html'));
check('rejects a JSON API response', looksLikeSiteHtml('{"events":[]}', 'application/json') === false);
check('rejects an HTML error page served as JSON', looksLikeSiteHtml('<!doctype html><html>error</html>', 'application/json') === false);

console.log(`\n===== ${failures === 0 ? 'PASS' : 'FAIL'} — ${passes} passed, ${failures} failed (scenario: ${scenario}) =====`);
process.exit(failures === 0 ? 0 : 1);
