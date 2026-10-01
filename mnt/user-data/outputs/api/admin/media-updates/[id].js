/* DELETE /api/admin/media-updates/:id — remove a reel / media update. */
import { assertAdmin, handlePreflight, requireMethod, run, sendJson } from '../../_lib/http.js';
import { getContent, setContent } from '../../_lib/store.js';

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;
  await run(res, async () => {
    assertAdmin(req);
    if (!requireMethod(req, res, ['DELETE'])) return;

    const id = decodeURIComponent(String(req.query?.id ?? ''));
    if (!id) {
      sendJson(res, 400, { error: 'Missing media update id.' });
      return;
    }

    const content = await getContent();
    const remaining = content.mediaUpdates.filter((update) => update.id !== id);
    if (remaining.length === content.mediaUpdates.length) {
      sendJson(res, 404, { error: `No media update with id "${id}".` });
      return;
    }

    sendJson(res, 200, await setContent({ ...content, mediaUpdates: remaining }));
  });
}
