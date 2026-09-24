# GNAAS CCTU Chapter — Website (React + Vite + Tailwind)

A faithful, feature-for-feature rebuild of the live site **https://gnass-cctu.vercel.app/**
(Ghana National Association of Adventist Students — Cape Coast Technical University chapter).

- Same markup structure, class names, ids, text, links and images as the live `index.html`
  (verified element-by-element: 439/439 elements match).
- The original stylesheet is used **verbatim** (`src/styles/site.css`), so the look is identical.
  Tailwind is wired in with *theme + utilities only* — its Preflight reset is disabled on purpose
  so it cannot alter the original design.
- The original admin portal (`admin.html`) is included as a hash route: **`#/admin`**.

The untouched original source files are kept for reference in [`original-site/`](original-site/).

---

## File map (original → this project)

| Original file | Rebuilt as |
| --- | --- |
| `index.html` (markup) | `src/pages/Home.tsx` + `src/components/*.tsx` |
| `style.css` | `src/styles/site.css` (verbatim) imported by `src/index.css` |
| `script.js` | hooks + components (see features below), `src/lib/ghanaTime.ts`, `src/lib/content.ts` |
| `admin.html` | `src/pages/Admin.tsx` (route `#/admin`) |
| `admin.css` | `src/styles/admin.css` (verbatim, only injected while the admin page is open) |
| `admin.js` | `src/pages/Admin.tsx` + `src/admin/*` |
| All copy, links, people, schedule, events… | `src/data/site.ts` (single place to edit content) |

```
src/
├── App.tsx                  # hash router: Home ↔ Admin (#/admin)
├── main.tsx                 # entry, adds html.js-enabled
├── index.css                # Tailwind (no preflight) + site.css
├── data/site.ts             # ALL static content, links, people, schedule, ASSET_BASE
├── lib/
│   ├── ghanaTime.ts         # Africa/Accra time, Sabbath countdown, schedule highlight
│   ├── content.ts           # /api/* client with local-store fallback + /api/health
│   ├── apiConfig.ts         # where the API lives (/api by default) + write password
│   ├── localStore.ts        # IndexedDB → localStorage → memory store
│   ├── eventDate.ts         # timezone-safe calendar date labels
│   └── downloadSite.ts      # "save the whole site as one HTML file" helper (not linked in the UI)
├── hooks/
│   ├── useTheme.ts          # dark mode (localStorage key "gnass-theme")
│   ├── useRevealOnScroll.ts # IntersectionObserver reveal animations
│   └── useChapterContent.ts # polls /api/content every 30 s
├── components/              # Header, Hero, Countdown, LatestMessage, Schedule, About,
│                            # Ministries, Media, Slideshow, LiveHub, Events, Team,
│                            # PrayerWall, Closing (Give, Alumni, Footer)
├── admin/                   # toast system, file drop zone, form fields
├── pages/                   # Home.tsx (public site), Admin.tsx (simple portal)
└── styles/                  # site.css, admin.css (verbatim copies)

server/index.mjs             # Option A backend: site + API, zero dependencies
server/seed.json             # events seeded into a fresh backend
api/                         # Option B backend: Vercel serverless functions
gnaas-cctu-chapter.html      # Option C: the whole site as one file (generated)

scripts/run-checks.sh        # all automated checks
scripts/local-flow.check.mts # admin → main-site flow, 3 storage modes
scripts/api-flow.check.mts   # real server over HTTP, 38 assertions
scripts/export-html.sh       # regenerate the single-file download
```

---

## Features (all carried over)

**Public site**
- Sticky header with logo, 5-link nav, **dark-mode toggle** (remembers choice, falls back to OS setting),
  Give CTA, mobile hamburger menu that closes on link tap, header shadow on scroll, skip link.
- Hero with sepia **Adventist pioneers collage** (Wikimedia Commons) and a gently shaking *Announcements* button.
- **Sabbath countdown** in Ghana time (Africa/Accra) to Friday 6:00 PM, ticking every second.
- **Latest Message** — GNAAS Congress 2026 video; replaced automatically when the admin publishes a new message.
- **Weekly schedule** — the card for the activity happening *right now* (Ghana time) is highlighted.
- About (stats), Ministries & departments grid.
- **Media reels** row: Event Highlights **auto-slideshow** (61 photos, 4 s, pause on hover, dot navigation),
  Church Dues & Welfare (tap-to-call), Virtual Prayer Meeting (Google Meet), placeholders, View More.
  Published media updates replace the reels.
- **SDA Live hub** — Adventist News Network feed (RSS → JSON, refreshed every 15 min, graceful fallback),
  Sabbath School iframe, Hope Channel Ghana TikTok embed, 3ABN Sabbath School Panel iframe, resource links.
- **Filterable events** calendar (All / Worship / Social / Outreach / Sports).
- **Executive team** in hierarchy groups with *View More* / *Return to Core*.
- **Prayer wall** — adds the request to the list and opens SMS to `0509511619` pre-filled.
- Give options, Alumni WhatsApp CTA, footer with community WhatsApp + Admin portal link — the footer has no
  extra links, exactly like the live site. (A one-click "save the whole site as one HTML file" button used to sit
  here; the code is still in `src/lib/downloadSite.ts` if you want it back — import `downloadSiteHtml` and call it.)
- Scroll-reveal animations (respects `prefers-reduced-motion`).

**Admin portal (`#/admin`)** — deliberately minimal
- Three panels: *Latest message*, *Media update*, *Calendar event* — write, publish, and delete from the list below each.
- A small badge in the header: **Live** (API connected) or **Saved in this browser**.
- Drag-and-drop uploads with type/size validation (JPEG, PNG, WebP, GIF, MP4, WebM, MOV — max 25 MB) and preview.
- Toast confirmations, draft auto-save, character counters, auto-growing textareas,
  **Ctrl/Cmd + S** to save, loading spinners.

---

## Backend — three ways to run the site

All three options build from the same code and speak the same API contract.

| | What it is | Needs | Updates reach |
| --- | --- | --- | --- |
| **A** | Node server (`server/index.mjs`) | Node 20+ | every visitor |
| **B** | Vercel functions (`api/` + `vercel.json`) | a Vercel project + KV/Blob stores | every visitor |
| **C** | One downloadable HTML file (`gnaas-cctu-chapter.html`) | nothing at all | the browser it was edited in |

**Option C is already generated for you** — `gnaas-cctu-chapter.html` in the project root (287 KB).
Double-click it to open the whole site, or regenerate it any time with `bash scripts/export-html.sh`.

### Option A — the bundled Node server (no dependencies, works right now)

Serves the built site **and** the API from one address, storing content in
`data/content.json` and uploads in `data/uploads/`.

```bash
npm run build
node server/index.mjs          # → http://localhost:4173
```

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4173` | port to listen on |
| `HOST` | `0.0.0.0` | interface to bind |
| `GNAAS_DATA_DIR` | `./data` | where `content.json` + `uploads/` live |
| `GNAAS_DIST_DIR` | `./dist` | the built site to serve |
| `GNAAS_ADMIN_TOKEN` | *(unset)* | optional password required by `/api/admin/*` |

Deploy it anywhere Node runs (Render, Railway, Fly.io, a VPS, `pm2`, Docker) and the admin
portal publishes to all visitors. Leave `GNAAS_ADMIN_TOKEN` unset and the API is open, exactly
like the original site; set it and admin writes must send it as a bearer token
(remembered in the admin portal, entered once via the browser's storage — see below).

### Option B — Vercel serverless functions (this repo is Vercel-ready)

`vercel.json` + the `api/` folder give you durable hosting on Vercel:

1. Import the repo into Vercel (framework: Vite; build `npm run build`, output `dist`).
2. Add a **KV / Upstash Redis** store to the project (env: `KV_REST_API_URL` + `KV_REST_API_TOKEN`,
   or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) — this holds the text content.
3. Add a **Blob** store (env: `BLOB_READ_WRITE_TOKEN`) — this holds uploaded images/videos.
4. Optional: set `GNAAS_ADMIN_TOKEN` to protect admin writes.

| Endpoint | Methods |
| --- | --- |
| `/api/content` | GET — public feed polled every 30 s |
| `/api/health` | GET — a plain readiness/status report |
| `/api/admin/content` | GET, PUT — load dashboard / publish latest message |
| `/api/admin/media` | POST — upload image or video (`FormData` field `file`) |
| `/api/admin/media-updates[/:id]` | POST, DELETE — reels |
| `/api/admin/events[/:id]` | POST, DELETE — calendar |
| `/api/media/:name` | GET — uploaded files (Node server only) |

### Option C — one HTML file, no backend

```bash
bash scripts/export-html.sh      # → gnaas-cctu-chapter.html
```

The script builds the site and copies the single-file bundle to the project root. That file **is**
the whole website — public site and admin portal, all CSS and JavaScript inlined, no server, no
build step, no dependencies:

- open it by double-clicking (works offline; images, fonts and the embedded feeds need internet),
- host it anywhere: GitHub Pages, Netlify drop, any web space, a USB stick, an email attachment,
- regenerate after any change with `bash scripts/export-html.sh`.

In this mode the admin portal writes to the browser it is used from (the header badge reads
**Saved in this browser**), which is ideal for demos, offline meetings or handing the site to
someone. For updates that reach all visitors, use Option A or B.

### How the admin portal finds the backend

The address is simply **`/api` on the same origin**, which is what both hosting options use — the
Vercel functions on a Vercel deployment, and the Node server (which serves the site and the API
together). There is nothing to configure, so the portal itself is minimal: three panels
(Latest message, Media update, Calendar event) and a small badge that reads **Live** when the API is
answering or **Saved in this browser** when it is not.

If you ever need to point the site elsewhere without editing code, set either of these in
`localStorage` (defaults live in `src/lib/apiConfig.ts`):

| Key | Example |
| --- | --- |
| `gnaas-api-base` | `https://my-api.onrender.com/api` |
| `gnaas-api-token` | the value of `GNAAS_ADMIN_TOKEN` on the server |

## Assets

Images and video are still served from the live deployment via one constant in `src/data/site.ts`:

```ts
export const ASSET_BASE = 'https://gnass-cctu.vercel.app/';
```

To self-host them, copy these from the original repo into `public/` and set `ASSET_BASE = ''`:

- `gnasscctulogo.png`
- `sermons and events/` → `congress.mp4`, `CHURCH DUES 2.png`, `prayer meeting.jpg`
- `images/` → executive photos (see `EXECUTIVE_GROUPS` in `src/data/site.ts`)
- `images/slideshows/` → 61 event photos (see `SLIDESHOW_IMAGES`)

Some photos are hosted on ImgBB (`i.ibb.co`) exactly as on the live site.

---

## Scripts

```bash
npm install
npm run dev                      # local development

npm run build                    # production build → dist/index.html (single file)
node server/index.mjs            # Option A: serve the build + the API on :4173

bash scripts/export-html.sh      # Option C: → gnaas-cctu-chapter.html
bash scripts/run-checks.sh       # 155 assertions (browser storage, downloads, real server)
```

`run-checks.sh` bundles `scripts/local-flow.check.mts` (admin → main-site flow in normal,
IndexedDB-blocked and fully-blocked browsers) and `scripts/api-flow.check.mts` (a real
`server/index.mjs` driven over HTTP: publish, upload, add/delete, restart persistence, the
optional write password, and the single-file download helpers).
