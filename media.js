/* POST /api/admin/media — upload an image or video (multipart field "file"). */
import { assertAdmin, handlePreflight, readUploadedFile, requireMethod, run, sendJson } from '../_lib/http.js';
import { uploadMedia } from '../_lib/store.js';

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;
  await run(res, async () => {
    assertAdmin(req);
    if (!requireMethod(req, res, ['POST'])) return;

    const file = await readUploadedFile(req);
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowed.includes(file.type)) {
      sendJson(res, 415, { error: 'Unsupported file type. Use JPEG, PNG, WebP, GIF, MP4, WebM, or MOV.' });
      return;
    }

    sendJson(res, 200, await uploadMedia(file));
  });
}
