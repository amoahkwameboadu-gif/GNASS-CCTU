/* DELETE /api/admin/events/:id — remove a calendar event. */
import { assertAdmin, handlePreflight, requireMethod, run, sendJson } from '../../_lib/http.js';
import { getContent, setContent } from '../../_lib/store.js';

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;
  await run(res, async () => {
    assertAdmin(req);
    if (!requireMethod(req, res, ['DELETE'])) return;

    const id = decodeURIComponent(String(req.query?.id ?? ''));
    if (!id) {
      sendJson(res, 400, { error: 'Missing event id.' });
      return;
    }

    const content = await getContent();
    const remaining = content.events.filter((event) => event.id !== id);
    if (remaining.length === content.events.length) {
      sendJson(res, 404, { error: `No event with id "${id}".` });
      return;
    }

    sendJson(res, 200, await setContent({ ...content, events: remaining }));
  });
}
