/* ==========================================================================
   GNASS CCTU CHAPTER — SCRIPT.JS
   Small, focused pieces of interactivity. Each section below does one job.
   ========================================================================== */

document.documentElement.classList.add('js-enabled');

/* ---------- 0. Ghana Time (Africa/Accra) Utilities ---------- */
// Ghana uses GMT (UTC+0) year-round — no DST. All date/time calculations
// for the countdown and schedule highlighting must use this timezone.
const GHANA_TZ = 'Africa/Accra';

/**
 * Returns a Date object representing "now" in Ghana Time.
 * Uses Intl.DateTimeFormat to get accurate time in Africa/Accra.
 */
function getGhanaNow() {
  // Get the current time in Ghana timezone
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: GHANA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type) => parts.find(p => p.type === type)?.value || '0';
  const year = Number(get('year'));
  const month = Number(get('month')) - 1; // JS months are 0-indexed
  const day = Number(get('day'));
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  const second = Number(get('second'));
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/**
 * Returns the day of week (0=Sun, 6=Sat) in Ghana Time.
 */
function getGhanaDay() {
  return getGhanaNow().getUTCDay();
}

/**
 * Returns the current hour (0-23) in Ghana Time.
 */
function getGhanaHour() {
  return getGhanaNow().getUTCHours();
}

/**
 * Returns the current minute (0-59) in Ghana Time.
 */
function getGhanaMinute() {
  return getGhanaNow().getUTCMinutes();
}

/* ---------- 1. Footer year ---------- */
// Keeps the copyright year correct forever, without editing HTML by hand.
document.getElementById('year').textContent = new Date().getFullYear();


/* ---------- 2. Dark mode toggle ---------- */
// We store the visitor's choice in localStorage so it's remembered on their
// next visit. The theme is applied by setting data-theme="dark" on <html>,
// which the CSS variables in style.css react to.
const root = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  themeToggle.setAttribute('aria-pressed', theme === 'dark');
  themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Turn off dark mode' : 'Turn on dark mode');
}

// On load: use the saved preference, or fall back to the visitor's OS setting.
const savedTheme = localStorage.getItem('gnass-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('gnass-theme', next);
});


/* ---------- 3. Mobile nav toggle ---------- */
// Opens/closes the menu list, and keeps the hamburger button's aria-expanded
// state in sync for screen readers.
const navToggle = document.getElementById('nav-toggle');
const mainNav = document.getElementById('main-nav');

navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

// Close the menu automatically once a visitor taps a link.
mainNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});


/* ---------- 4. Sabbath countdown (Ghana Time) ---------- */
// Ghana uses GMT/UTC+0, so the countdown uses UTC throughout regardless of
// the visitor's local timezone.
function getNextSabbathStart() {
  const now = getGhanaNow(); // Use Ghana Time
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18, 0, 0, 0));

  const FRIDAY = 5;
  let daysUntilFriday = (FRIDAY - now.getUTCDay() + 7) % 7;

  // If it's already Friday but past 6 PM, jump to next week's Friday.
  if (daysUntilFriday === 0 && now > target) daysUntilFriday = 7;

  target.setUTCDate(now.getUTCDate() + daysUntilFriday);
  return target;
}

const statusEl = document.getElementById('countdown-status');
const dEl = document.getElementById('cd-days');
const hEl = document.getElementById('cd-hours');
const mEl = document.getElementById('cd-mins');
const sEl = document.getElementById('cd-secs');

function pad(num) { return String(num).padStart(2, '0'); }

function tickCountdown() {
  const now = getGhanaNow(); // Use Ghana Time
  const target = getNextSabbathStart();
  let diff = target - now;

  // Sabbath lasts roughly 24 hours. Once we're inside that window, diff goes
  // negative and we say "Sabbath is here".
  if (diff <= 0 && diff > -24 * 60 * 60 * 1000) {
    statusEl.textContent = 'Sabbath is here — enjoy the rest';
    dEl.textContent = hEl.textContent = mEl.textContent = sEl.textContent = '00';
    return;
  }
  if (diff <= 0) diff = target.setUTCDate(target.getUTCDate() + 7) - now; // safety fallback

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  statusEl.textContent = 'Sabbath begins in';
  dEl.textContent = pad(days);
  hEl.textContent = pad(hours);
  mEl.textContent = pad(mins);
  sEl.textContent = pad(secs);
}

tickCountdown();
setInterval(tickCountdown, 1000);


/* ---------- 5. Weekly Schedule — Dynamic Activity Highlighting (Ghana Time) ---------- */
// Checks the current day/time in Ghana and applies the "current" class
// to the schedule card for the activity happening right now.
// If no activity is ongoing, removes the highlight from ALL cards.
const scheduleCards = document.querySelectorAll('.schedule-grid .schedule-card');

/**
 * Determines which schedule card (if any) should be highlighted based on
 * the current day and time in Ghana Time (Africa/Accra).
 * Schedule:
 * - Saturday: Sabbath School (9:00 AM - 10:30 AM)
 * - Saturday: Divine Service (10:30 AM - 12:30 PM approx)
 * - Wednesday: Vespers (6:30 PM - 8:00 PM approx)
 * - Friday: Adventist Youth (AY) (7:00 PM - 9:00 PM approx)
 */
function updateScheduleHighlight() {
  const day = getGhanaDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const hour = getGhanaHour();
  const minute = getGhanaMinute();
  const timeInMinutes = hour * 60 + minute;

  // Remove "current" from ALL cards first
  scheduleCards.forEach(card => card.classList.remove('current'));

  // Saturday = 6 (using getUTCDay since we're using UTC-based Ghana time)
  // Note: getUTCDay() returns 6 for Saturday
  const SATURDAY = 6;
  const WEDNESDAY = 3;
  const FRIDAY = 5;

  let targetCard = null;

  if (day === SATURDAY) {
    // Sabbath School: 9:00 AM - 10:30 AM (540 - 630 minutes)
    if (timeInMinutes >= 540 && timeInMinutes < 630) {
      targetCard = document.querySelector('.schedule-card:nth-child(1)');
    }
    // Divine Service: 10:30 AM - 12:30 PM (630 - 750 minutes)
    else if (timeInMinutes >= 630 && timeInMinutes < 750) {
      targetCard = document.querySelector('.schedule-card:nth-child(2)');
    }
  } else if (day === WEDNESDAY) {
    // Vespers: 6:30 PM - 8:00 PM (1110 - 1200 minutes)
    if (timeInMinutes >= 1110 && timeInMinutes < 1200) {
      targetCard = document.querySelector('.schedule-card:nth-child(3)');
    }
  } else if (day === FRIDAY) {
    // Adventist Youth (AY): 7:00 PM - 9:00 PM (1140 - 1260 minutes)
    if (timeInMinutes >= 1140 && timeInMinutes < 1260) {
      targetCard = document.querySelector('.schedule-card:nth-child(4)');
    }
  }

  // Apply highlight ONLY to current activity
  if (targetCard) {
    targetCard.classList.add('current');
  }
  // If no activity is ongoing, NO card gets highlighted (all highlights removed above)
}

// Run immediately and then every 30 seconds to keep in sync
updateScheduleHighlight();
setInterval(updateScheduleHighlight, 30 * 1000);


/* ---------- 5. Event filtering ---------- */
// Shows/hides .event-card elements based on which filter chip is active.
// This is a simple client-side filter, not a live/synced calendar.
const filterButtons = document.querySelectorAll('.filter-btn');
const eventCards = document.querySelectorAll('.event-card');

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterButtons.forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    const filter = btn.dataset.filter;
    eventCards.forEach((card) => {
      const show = filter === 'all' || card.dataset.category === filter;
      card.style.display = show ? '' : 'none';
    });
  });
});


/* ---------- 6. Prayer wall with SMS submission ---------- */
// Adds a new request card to the top of the list when the form is submitted.
// Opens the user's default SMS app with the prayer request pre-filled.
const prayerForm = document.getElementById('prayer-form');
const prayerList = document.getElementById('prayer-list');

prayerForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const nameInput = document.getElementById('prayer-name');
  const requestInput = document.getElementById('prayer-request');
  const name = nameInput.value.trim() || 'Anonymous';
  const request = requestInput.value.trim();
  if (!request) return;

  // Create prayer request text for SMS
  const prayerRequestText = `Prayer Request from ${name}:\n${request}`;

  // Add to local prayer list immediately
  const item = document.createElement('li');
  item.className = 'prayer-item';
  const nameEl = document.createElement('strong');
  nameEl.textContent = name;
  const requestEl = document.createElement('p');
  requestEl.textContent = request;
  item.append(nameEl, requestEl);

  prayerList.prepend(item);
  prayerForm.reset();

  // Trigger SMS protocol
  window.location.href = "sms:0509511619?body=" + encodeURIComponent(prayerRequestText);
});


/* ---------- 7. Header shadow on scroll (small visual polish) ---------- */
const header = document.getElementById('site-header');
window.addEventListener('scroll', () => {
  header.style.boxShadow = window.scrollY > 8
    ? '0 4px 18px rgba(0,0,0,0.18)'
    : '0 2px 12px rgba(0,0,0,0.12)';
}, { passive: true });


/* ---------- 8. Live Adventist News Network feed ---------- */
// ANN publishes the source RSS. The public proxy only converts RSS to JSON so
// browsers can read it; each item still links back to adventist.news.
const annFeed = document.getElementById('ann-feed');
const annRssUrl = 'https://adventist.news/rss.xml';
const annProxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(annRssUrl)}`;

function renderAnnFallback() {
  annFeed.innerHTML = '<p class="feed-status">The live feed is temporarily unavailable. <a href="https://adventist.news/" target="_blank" rel="noopener noreferrer">Read the latest ANN stories ↗</a></p>';
}

async function loadAnnFeed() {
  try {
    const response = await fetch(annProxyUrl, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`ANN feed request failed: ${response.status}`);
    const data = await response.json();
    const stories = (data.items || []).slice(0, 5);
    if (!stories.length) throw new Error('ANN feed returned no stories');
    annFeed.replaceChildren(...stories.map((story) => {
      const item = document.createElement('article');
      item.className = 'feed-item';
      const link = document.createElement('a');
      link.href = story.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = story.title;
      const date = document.createElement('time');
      date.dateTime = story.pubDate || '';
      date.textContent = story.pubDate ? new Date(story.pubDate).toLocaleDateString() : 'Latest update';
      item.append(link, date);
      return item;
    }));
  } catch (error) {
    renderAnnFallback();
  }
}

loadAnnFeed();
setInterval(loadAnnFeed, 15 * 60 * 1000);


/* ---------- 9. Smooth scroll reveal animations ---------- */
const revealElements = document.querySelectorAll('.section, .latest-card, .schedule-grid, .about-grid, .ministry-grid, .media-row, .live-grid, .video-grid, .resource-row, .team-carousel, .prayer-form, .prayer-list, .give-options, .alumni-inner');
revealElements.forEach((element) => {
  element.classList.add('reveal-on-scroll');
  if (element.children.length > 1) element.classList.add('reveal-stagger');
});

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in-view');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  revealElements.forEach((element) => revealObserver.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add('is-in-view'));
}


/* ---------- 9. Scroll reveal for the daily prayer meeting ---------- */
const prayerMeetingCard = document.querySelector('.prayer-meeting-card');
if (prayerMeetingCard && 'IntersectionObserver' in window) {
  const prayerMeetingObserver = new IntersectionObserver((entries, observer) => {
    if (entries[0].isIntersecting) {
      prayerMeetingCard.classList.add('is-visible');
      observer.disconnect();
    }
  }, { threshold: 0.2 });
  prayerMeetingObserver.observe(prayerMeetingCard);
} else if (prayerMeetingCard) {
  prayerMeetingCard.classList.add('is-visible');
}


/* ---------- 9. Executive hierarchy groups ---------- */
const executiveGroups = [...document.querySelectorAll('.team-grid-group')];
const executiveButton = document.getElementById('view-more-executives');
let executiveGroupIndex = 0;

executiveButton.addEventListener('click', () => {
  executiveGroups[executiveGroupIndex].hidden = true;
  executiveGroups[executiveGroupIndex].classList.remove('is-visible');
  executiveGroupIndex = (executiveGroupIndex + 1) % executiveGroups.length;
  executiveGroups[executiveGroupIndex].hidden = false;
  executiveGroups[executiveGroupIndex].classList.add('is-visible');
  const isLastGroup = executiveGroupIndex === executiveGroups.length - 1;
  executiveButton.setAttribute('aria-expanded', String(isLastGroup));
  executiveButton.setAttribute('aria-label', isLastGroup ? 'Return to core executives' : 'Show next executive group');
  executiveButton.innerHTML = isLastGroup ? 'Return to Core <span aria-hidden="true">↺</span>' : 'View More <span aria-hidden="true">+</span>';
});


