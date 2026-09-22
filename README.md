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

## Cloudflare Pages admin portal
The site includes `admin.html` and Pages Functions under `functions/api/`. Latest messages,
calendar events, and independently publishable Media/reel updates are stored in Cloudflare D1;
uploaded images and videos are stored in R2. Before deploying:

1. Create the D1 database and R2 bucket, then replace `database_id` in `wrangler.toml`.
2. Run `npx wrangler d1 migrations apply gnaas-content --remote`.
3. Set the secret (never put it in JavaScript): `npx wrangler pages secret put ADMIN_PASSWORD`.
4. Deploy with `npx wrangler pages deploy .`.

The admin session is an HTTP-only, Secure, SameSite cookie and expires after eight hours.

## Still needs real content or a backend
These were part of the brief but need more than plain HTML/CSS/JS to work for real:
- **Logo & photos**: drop `gnasscctulogo.png` and any real photos into `images/`, then update the `<img>`/background references in `index.html` and `style.css`.
- **Background video**: swap the gradient in `.hero-media` (in `style.css`) for a real video once you have footage.
- **Sabbath countdown**: the countdown uses Ghana Time (GMT/UTC+0) and a rough 6:00 PM Friday start.
- **Online giving**: the Give buttons are placeholders. Taking real payments needs a provider (e.g. Paystack, Flutterwave, PayPal) and a secure backend — that's a separate project from this static site.
- **Prayer wall & alumni portal**: currently front-end only demos. Saving requests or member accounts long-term needs a database and backend.
- **Live events calendar**: the events section is a static, filterable list. A calendar that updates itself needs a backend or a service like the Google Calendar API.
