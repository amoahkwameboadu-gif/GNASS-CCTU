/* ==========================================================================
   Download the whole chapter site as ONE self-contained HTML file.

   The build already inlines all CSS and JavaScript into dist/index.html, so a
   copy of that file is a complete, standalone website (public site + admin
   portal). This module hands the visitor a byte-identical copy of it.

   Two strategies, best first:
     1. "fetched"    — re-download this page's own HTML. Exact copy of the
                       deployed build (works whenever the site is served over
                       http/https).
     2. "serialized" — if the page was opened straight from a file:// path (or
                       is offline), the live document is serialised instead:
                       runtime-only bits are stripped and the app re-mounts
                       fresh when the file is opened.
   ========================================================================== */

export const DOWNLOAD_FILE_NAME = 'gnaas-cctu-chapter.html';

/**
 * Removes everything that only exists at runtime from a serialised document,
 * so the resulting file matches the original single-file build.
 * Pure string work — no DOM access — so it can be unit tested in Node.
 */
export function cleanSnapshotHtml(html: string): string {
  return html
    // admin.css is injected only while the admin portal is open
    .replace(/<style id="admin-style">[\s\S]*?<\/style>/g, '')
    // toast host is created on demand
    .replace(/<div id="toast-container"[\s\S]*?<\/div>\s*<\/body>/, '</body>')
    // runtime flags: the app sets these itself on load
    .replace(/\s+data-theme="[^"]*"/, '')
    .replace(/\s+class="js-enabled"/, '');
}

/** True when a fetched response looks like this site's own HTML. */
export function looksLikeSiteHtml(html: string, contentType = ''): boolean {
  if (/json|javascript|image|pdf/i.test(contentType)) return false;
  const head = html.replace(/^\uFEFF/, '').trimStart().slice(0, 200).toLowerCase();
  return head.startsWith('<!doctype html') || head.startsWith('<html');
}

function saveHtml(html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = DOWNLOAD_FILE_NAME;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before the URL is revoked
  window.setTimeout(() => URL.revokeObjectURL(url), 20000);
}

export type DownloadResult = 'fetched' | 'serialized';

export async function downloadSiteHtml(): Promise<DownloadResult> {
  // 1. The deployed file itself
  try {
    const response = await fetch(window.location.href, { cache: 'no-store' });
    const contentType = response.headers.get('content-type') ?? '';
    const text = await response.text();
    if (response.ok && looksLikeSiteHtml(text, contentType)) {
      saveHtml(text);
      return 'fetched';
    }
  } catch {
    /* file://, offline, or blocked — fall through to serialising */
  }

  // 2. A clean copy of the live document. The mounted app is emptied so the
  //    downloaded file starts from an empty mount point, exactly like the build.
  const root = document.getElementById('root');
  const rootMarkup = root ? root.innerHTML : '';
  if (root) root.innerHTML = '';

  const snapshot = cleanSnapshotHtml(document.documentElement.outerHTML);

  if (root) root.innerHTML = rootMarkup; // keep the running app intact

  saveHtml(`<!doctype html>\n${snapshot}`);
  return 'serialized';
}
