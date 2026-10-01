/* POST /api/admin/media-updates — publish a reel / media update. */
import { assertAdmin, handlePreflight, readJsonBody, requireMethod, run, sendJson } from '../_lib/http.js';
import { getContent, setContent } from '../_lib/store.js';

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;
  await run(res, async () => {
    assertAdmin(req);
    if (!requireMethod(req, res, ['POST'])) return;

    const body = await readJsonBody(req);
    const title = String(body.title ?? '').trim();
    const mediaUrl = String(body.mediaUrl ?? '').trim();
    const mediaType = String(body.mediaType ?? '').trim();
    if (!title || !mediaUrl || !mediaType) {
      sendJson(res, 400, { error: 'A title, media URL and media type are required.' });
      return;
    }

    const content = await getContent();
    const update = {
      id: `mu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      body: String(body.body ?? ''),
      mediaUrl,
      mediaType,
      createdAt: new Date().toISOString(),
    };

    sendJson(res, 200, await setContent({ ...content, mediaUpdates: [update, ...content.mediaUpdates] }));
  });
}
