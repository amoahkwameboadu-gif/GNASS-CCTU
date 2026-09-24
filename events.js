/* POST /api/admin/events — add a calendar event. */
import { assertAdmin, handlePreflight, readJsonBody, requireMethod, run, sendJson } from '../_lib/http.js';
import { sortEvents } from '../_lib/seed.js';
import { getContent, setContent } from '../_lib/store.js';

const CATEGORIES = ['worship', 'social', 'outreach', 'sports'];

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;
  await run(res, async () => {
    assertAdmin(req);
    if (!requireMethod(req, res, ['POST'])) return;

    const body = await readJsonBody(req);
    const title = String(body.title ?? '').trim();
    const eventDate = String(body.eventDate ?? '').trim();
    const category = String(body.category ?? '').trim() || 'worship';
    if (!title || !eventDate) {
      sendJson(res, 400, { error: 'A title and a date are required.' });
      return;
    }
    if (Number.isNaN(new Date(eventDate).getTime())) {
      sendJson(res, 400, { error: 'The event date could not be understood.' });
      return;
    }
    if (!CATEGORIES.includes(category)) {
      sendJson(res, 400, { error: `Category must be one of: ${CATEGORIES.join(', ')}.` });
      return;
    }

    const content = await getContent();
    const event = {
      id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      description: String(body.description ?? ''),
      eventDate,
      category,
    };

    sendJson(res, 200, await setContent({ ...content, events: sortEvents([...content.events, event]) }));
  });
}
