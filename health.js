/* GET /api/health — what the admin portal's Backend panel reports. */
import { handlePreflight, requireMethod, run, sendJson } from './_lib/http.js';
import { getContent, storageInfo } from './_lib/store.js';

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;
  await run(res, async () => {
    if (!requireMethod(req, res, ['GET'])) return;
    try {
      const content = await getContent();
      sendJson(res, 200, {
        ok: true,
        runtime: 'vercel-functions',
        ...storageInfo(),
        events: content.events.length,
        mediaUpdates: content.mediaUpdates.length,
        hasLatestMessage: Boolean(content.latestMessage),
        at: new Date().toISOString(),
      });
    } catch (error) {
      sendJson(res, error.statusCode || 500, { ok: false, runtime: 'vercel-functions', ...storageInfo(), error: error.message });
    }
  });
}
