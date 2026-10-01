/* GET  /api/admin/content — dashboard load
   PUT  /api/admin/content — publish the latest message                        */
import { assertAdmin, handlePreflight, readJsonBody, requireMethod, run, sendJson } from '../_lib/http.js';
import { getContent, setContent } from '../_lib/store.js';

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;
  await run(res, async () => {
    assertAdmin(req);

    if (req.method === 'GET') {
      sendJson(res, 200, await getContent());
      return;
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      if (!requireMethod(req, res, ['PUT', 'POST'])) return;
      const body = await readJsonBody(req);
      const title = String(body.title ?? '').trim();
      const text = String(body.body ?? '').trim();
      if (!title || !text) {
        sendJson(res, 400, { error: 'Both a title and a body are required.' });
        return;
      }

      const content = await getContent();
      const mediaUrl = typeof body.mediaUrl === 'string' && body.mediaUrl ? body.mediaUrl : content.latestMessage?.mediaUrl;
      const mediaType = typeof body.mediaType === 'string' && body.mediaType ? body.mediaType : content.latestMessage?.mediaType;

      const saved = await setContent({
        ...content,
        latestMessage: { title, body: text, mediaUrl, mediaType, updatedAt: new Date().toISOString() },
      });
      sendJson(res, 200, saved);
      return;
    }

    sendJson(res, 405, { error: `Method ${req.method} not allowed on /api/admin/content.` });
  });
}
