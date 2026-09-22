# GNASS CCTU Chapter Website

## Files
- `index.html` — all page content and structure
- `style.css` — all styling, including dark mode and mobile layout
- `script.js` — dark mode toggle, mobile menu, Sabbath countdown, event filter, prayer wall demo
- `images/` — empty folder; add your real logo and photos here

## Historical hero image
The hero collage uses public-domain pioneer portraits hosted by [Wikimedia Commons](https://commons.wikimedia.org/): James and Ellen White, Joseph Bates, and John Nevins Andrews. CSS applies grayscale and sepia grading with a charcoal and golden-yellow overlay.

## To open it
Just double-click `index.html` — no server or install needed. The static content is retained
as a fallback when the Pages API is unavailable.

## Admin portal (Vercel + GitHub-backed)

`admin.html` + `admin.js` + `admin.css` provide a content-editing UI. Data is stored in
`data/site-content.json` and persisted to GitHub via the Admin API (`api/admin/*`).

### Quick start (Vercel)

1. **Push to GitHub** (already done).
2. **Import in Vercel**: New Project → Import `amoahkwameboadu-gif/GNASS-CCTU`.
3. **Set Environment Variables** in Vercel Dashboard → Settings → Environment Variables:
   - `GITHUB_TOKEN` – a classic PAT with `repo` scope.
   - `GITHUB_REPO_OWNER` – `amoahkwameboadu-gif`
   - `GITHUB_REPO_NAME` – `GNASS-CCTU`
   - `GITHUB_BRANCH` – `main`
4. **Deploy**. Vercel will install deps (`npm install`), build the serverless functions, and serve the static site.

### Local development

```bash
npm install
cp .env.example .env.local   # fill in your GitHub token
vercel dev
```

Open `http://localhost:3000/admin.html` — the dashboard loads directly (no login).
Changes you save are committed to `data/site-content.json` on the `main` branch.

### Data model (`data/site-content.json`)

- `latestMessage` – { title, body, mediaUrl, mediaType, updatedAt }
- `events[]` – { id, title, description, eventDate, category }
- `mediaUpdates[]` – { id, title, body, mediaUrl, mediaType, createdAt }

Media uploads are stored as base64 data URLs in the JSON (demo). For production,
replace `api/admin/media.ts` with Vercel Blob or an external bucket.

### Protecting the admin page

The portal has no built-in auth. Add a firewall rule, Vercel Authentication, or
a Cloudflare Access policy in front of `/admin.html` before exposing publicly.

## Still needs real content or a backend
These were part of the brief but need more than plain HTML/CSS/JS to work for real:
- **Logo & photos**: drop `gnasscctulogo.png` and any real photos into `images/`, then update the `<img>`/background references in `index.html` and `style.css`.
- **Background video**: swap the gradient in `.hero-media` (in `style.css`) for a real video once you have footage.
- **Sabbath countdown**: the countdown uses Ghana Time (GMT/UTC+0) and a rough 6:00 PM Friday start.
- **Online giving**: the Give buttons are placeholders. Taking real payments needs a provider (e.g. Paystack, Flutterwave, PayPal) and a secure backend — that's a separate project from this static site.
- **Prayer wall & alumni portal**: currently front-end only demos. Saving requests or member accounts long-term needs a database and backend.
- **Live events calendar**: the events section is a static, filterable list. A calendar that updates itself needs a backend or a service like the Google Calendar API.
