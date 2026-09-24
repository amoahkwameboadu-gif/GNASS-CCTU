/* ==========================================================================
   Shared multipart/form-data parsing (used by the Node server and by the
   Vercel function in /api). Only what the admin portal needs: text fields and
   a single file field named "file".
   ========================================================================== */

/** Extracts the boundary string from a Content-Type header, or null. */
export function getMultipartBoundary(contentType = '') {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!match) return null;
  return (match[1] || match[2] || '').trim();
}

/**
 * Parses a multipart body.
 * @param {Buffer|Uint8Array} body raw request body
 * @param {string} boundary boundary from the Content-Type header
 * @returns {{fields: Record<string,string>, file: {filename:string,type:string,data:Buffer}|null}}
 */
export function parseMultipartBody(body, boundary) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const fields = {};
  let file = null;
  if (!boundary) return { fields, file };

  const delimiter = Buffer.from(`--${boundary}`);
  let index = buffer.indexOf(delimiter);
  if (index === -1) return { fields, file };

  index += delimiter.length;

  while (index < buffer.length) {
    // End of body: "--" right after the delimiter
    if (buffer[index] === 0x2d && buffer[index + 1] === 0x2d) break;

    // Skip the CRLF that follows the delimiter
    if (buffer[index] === 0x0d && buffer[index + 1] === 0x0a) index += 2;

    const headerEnd = buffer.indexOf('\r\n\r\n', index);
    if (headerEnd === -1) break;

    const headerText = buffer.slice(index, headerEnd).toString('utf8');
    const partStart = headerEnd + 4;

    const nextDelimiter = buffer.indexOf(delimiter, partStart);
    if (nextDelimiter === -1) break;

    // The CRLF immediately before the next delimiter belongs to the delimiter
    let partEnd = nextDelimiter;
    if (buffer[partEnd - 2] === 0x0d && buffer[partEnd - 1] === 0x0a) partEnd -= 2;

    const data = buffer.slice(partStart, partEnd);

    const nameMatch = /name="([^"]*)"/i.exec(headerText);
    const filenameMatch = /filename="([^"]*)"/i.exec(headerText);
    const typeMatch = /Content-Type:\s*([^\r\n;]+)/i.exec(headerText);
    const name = nameMatch ? nameMatch[1] : '';

    if (filenameMatch && filenameMatch[1]) {
      file = {
        filename: filenameMatch[1],
        type: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
        data,
      };
    } else if (name) {
      fields[name] = data.toString('utf8');
    }

    index = nextDelimiter + delimiter.length;
  }

  return { fields, file };
}
