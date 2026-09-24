#!/usr/bin/env bash
# ==========================================================================
# Exports the entire site as ONE self-contained HTML file (Option C).
#
#   bash scripts/export-html.sh
#
# Produces gnaas-cctu-chapter.html in the project root: the public site and
# the admin portal in a single file, with all CSS and JavaScript inlined.
# Open it by double-clicking, or host it anywhere (GitHub Pages, Netlify
# drop, a USB stick, an email attachment).
# ==========================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="gnaas-cctu-chapter.html"

npm run build >/dev/null
cp dist/index.html "$OUT"

python3 - "$OUT" <<'PY'
import re, sys
path = sys.argv[1]
html = open(path, encoding='utf-8').read()
problems = []
if 'id="root"' not in html:
    problems.append('mount point missing')
if '<script' not in html or '<style' not in html:
    problems.append('inlined css/js missing')
external = [s for s in re.findall(r'<script[^>]*src="([^"]+)"', html)]
if external:
    problems.append(f'external scripts: {external}')
if problems:
    print('✗ export problem(s): ' + '; '.join(problems))
    sys.exit(1)
print(f'✓ wrote {path} ({len(html):,} bytes) — self-contained single-file site')
PY

echo "  Open it, or host it anywhere. Regenerate after any change with this script."
