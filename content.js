/* GET /api/content — the public content feed the main site polls every 30s. */
import { handlePreflight, requireMethod, run, sendJson } from './_lib/http.js';
import { getContent } from './_lib/store.js';

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;
  await run(res, async () => {
    if (!requireMethod(req, res, ['GET', 'HEAD'])) return;
    const content = await getContent();
    sendJson(res, 200, content);
  });
}
