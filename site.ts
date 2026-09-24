/* ==========================================================================
   GNAAS CCTU CHAPTER — SITE CONTENT
   Every piece of static content from the live site (gnass-cctu.vercel.app)
   lives here, so the components stay small and the copy is easy to edit.
   ========================================================================== */

/**
 * Where the chapter's own media files (logo, executive photos, sermon/event
 * graphics, slideshow pictures, congress video) are served from.
 *
 * The files are still hosted on the live Vercel deployment. If you copy the
 * original `images/`, `sermons and events/` folders and `gnasscctulogo.png`
 * into this project's `public/` folder, change this to '' (empty string).
 */
export const ASSET_BASE = 'https://gnass-cctu.vercel.app/';

/** Builds a full URL for a chapter asset, exactly as the original relative paths. */
export const asset = (path: string) => `${ASSET_BASE}${path}`;

export const LOGO_SRC = asset('gnasscctulogo.png');
export const LOGO_ALT = 'GNAAS CCTU Chapter logo';

/* ---------- Header navigation (5 links max, per the nav brief) ---------- */
export const NAV_LINKS = [
  { href: '#about', label: 'About Us' },
  { href: '#ministries', label: 'Ministries' },
  { href: '#media', label: 'Media' },
  { href: '#live', label: 'Live' },
  { href: '#give', label: 'Give' },
];

/* ---------- Hero: public-domain pioneer portraits (Wikimedia Commons) ---------- */
export const PIONEERS = [
  { src: 'https://upload.wikimedia.org/wikipedia/commons/7/75/James_and_Ellen_White.jpg', alt: 'James and Ellen White' },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Joseph_Bates_%281865%29.jpg', alt: 'Joseph Bates' },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/6/66/John_Nevins_Andrews.jpg', alt: 'John Nevins Andrews' },
];

/* ---------- Latest message (static fallback, replaced by /api/content) ---------- */
export const LATEST_MESSAGE = {
  title: 'GNAAS Congress 2026',
  summary: 'One Week.🌝 One Purpose.🪢 One Flame🔥',
  body: "Be present to witness this year's GNAAS Congress. Sept. 20-27 | St. Monica's College, Asante Mampong. Register Now🤗: http://congress.gnaas.org ©️GNAAS NATIONAL 2026",
  videoSrc: asset('sermons%20and%20events/congress.mp4'),
};

/* ---------- Weekly service schedule ---------- */
export const SCHEDULE = [
  { day: 'Saturday', title: 'Sabbath School', time: '9:00 AM', text: 'Bible study in small groups, all departments welcome.' },
  { day: 'Saturday', title: 'Divine Service', time: '10:30 AM', text: 'Worship, music and the weekly message. Our main gathering.' },
  { day: 'Wednesday', title: 'Vespers', time: '6:30 PM', text: 'A quieter, midweek reset — prayer, song and short devotion.' },
  { day: 'Friday', title: 'Adventist Youth (AY)', time: '7:00 PM', text: 'Fellowship, testimonies and welcoming Sabbath together.' },
];

/* ---------- About stats ---------- */
export const ABOUT_STATS = [
  { value: '80+', label: 'Active members' },
  { value: '2', label: 'new departments' },
  { value: '2000', label: 'Established' },
];

/* ---------- Ministries & departments ---------- */
export const MINISTRIES = [
  { icon: '♪', title: 'Music', text: 'Choir, praise team and instrumentalists leading worship each week.' },
  { icon: '✚', title: 'Welfare', text: 'Practical support for students facing hardship — food, fees and care.' },
  { icon: '✉', title: 'Evangelism', text: 'Outreach programs, campus crusades and personal Bible studies.' },
  { icon: '⚽', title: 'Sports', text: 'Inter-chapter tournaments and fitness fellowship on the field.' },
  { icon: '✎', title: 'Education', text: 'Mentorship, tutoring and study groups for academic success.' },
  { icon: '☺', title: 'Social', text: 'Chapter socials, retreats and get-togethers that build friendship.' },
];

/* ---------- Media reels ---------- */
export const CHURCH_DUES_REEL = {
  href: 'tel:0598559981',
  ariaLabel: 'Call for Church Dues & Welfare',
  src: asset('sermons%20and%20events/CHURCH%20DUES%202.png'),
  fallback: 'https://i.ibb.co/1CnkvWT/CHURCH-DUES-2.png',
  alt: 'Church Dues & Welfare',
  title: 'Church Dues & Welfare',
  subtitle: 'Support our chapter',
};

export const PRAYER_MEETING_REEL = {
  href: 'https://meet.google.com/qfg-hkau-pug',
  ariaLabel: 'Join Virtual Prayer Meeting',
  src: asset('sermons%20and%20events/prayer%20meeting.jpg'),
  fallback: 'https://i.ibb.co/4g1NgMqs/prayer-meeting.jpg',
  alt: 'Virtual Prayer Meeting',
  title: 'Virtual Prayer Meeting',
  subtitle: 'Join us live',
};

/* Event Highlights slideshow — files in images/slideshows/ */
export const SLIDESHOW_IMAGES = [
  'IMG-20260114-WA0023.jpg',
  'IMG-20260114-WA0024.jpg',
  'IMG-20260114-WA0025.jpg',
  'IMG-20260114-WA0026.jpg',
  'IMG-20260114-WA0027.jpg',
  'IMG-20260114-WA0028.jpg',
  'IMG-20260114-WA0029.jpg',
  'IMG-20260114-WA0030.jpg',
  'IMG-20260114-WA0031.jpg',
  'IMG-20260114-WA0032.jpg',
  'IMG-20260114-WA0033.jpg',
  'IMG-20260114-WA0047.jpg',
  'IMG-20260114-WA0048.jpg',
  'IMG-20260114-WA0049.jpg',
  'IMG-20260114-WA0050.jpg',
  'IMG-20260114-WA0051.jpg',
  'IMG-20260114-WA0052.jpg',
  'IMG-20260114-WA0053.jpg',
  'IMG-20260114-WA0054.jpg',
  'IMG-20260114-WA0055.jpg',
  'IMG-20260114-WA0056.jpg',
  'IMG-20260114-WA0057.jpg',
  'IMG-20260114-WA0058.jpg',
  'IMG-20260114-WA0059.jpg',
  'IMG-20260114-WA0060.jpg',
  'IMG-20260114-WA0061.jpg',
  'IMG-20260114-WA0062.jpg',
  'IMG-20260114-WA0063.jpg',
  'IMG-20260114-WA0064.jpg',
  'IMG-20260114-WA0065.jpg',
  'IMG-20260123-WA0024.jpg',
  'IMG-20260123-WA0025.jpg',
  'IMG-20260123-WA0026.jpg',
  'IMG-20260123-WA0027.jpg',
  'IMG-20260123-WA0028.jpg',
  'IMG-20260123-WA0029.jpg',
  'IMG-20260123-WA0030.jpg',
  'IMG-20260123-WA0031.jpg',
  'IMG-20260123-WA0032.jpg',
  'IMG-20260123-WA0033.jpg',
  'IMG-20260123-WA0034.jpg',
  'IMG-20260123-WA0035.jpg',
  'IMG-20260123-WA0036.jpg',
  'IMG-20260123-WA0037.jpg',
  'IMG-20260123-WA0038.jpg',
  'IMG-20260124-WA0002.jpg',
  'IMG-20260124-WA0003.jpg',
  'IMG-20260124-WA0004.jpg',
  'IMG-20260124-WA0005.jpg',
  'IMG-20260124-WA0006.jpg',
  'IMG-20260124-WA0007.jpg',
  'IMG-20260124-WA0008.jpg',
  'IMG-20260202-WA0022.jpg',
  'IMG-20260202-WA0024.jpg',
  'IMG-20260202-WA0043.jpg',
  'IMG-20260202-WA0107.jpg',
  'IMG-20260202-WA0191.jpg',
  'IMG-20260202-WA0229.jpg',
  'IMG-20260202-WA0238.jpg',
  'IMG-20260202-WA0241.jpg',
  'IMG-20260202-WA0246.jpg',
].map((name) => asset(`images/slideshows/${name}`));

export const SLIDE_DURATION = 4000; // 4 seconds per slide

/* ---------- SDA Live hub ---------- */
export const ANN_SITE = 'https://adventist.news/';
export const ANN_RSS_URL = 'https://adventist.news/rss.xml';
export const SABBATH_SCHOOL_URL = 'https://sabbath.school/';
export const TIKTOK_PROFILE = 'https://www.tiktok.com/@hopechannelgh';
export const THREE_ABN_URL = 'https://3abnsabbathschoolpanel.com/';

export const RESOURCES = [
  { href: 'https://hopechannel.com/', title: 'Hope Channel', text: 'Watch faith-filled programming ↗' },
  { href: 'https://awr.org/listen/', title: 'Adventist World Radio', text: 'Listen live around the world ↗' },
  { href: 'https://egwwritings.org/', title: 'EGW Writings', text: 'Search the writings database ↗' },
];

/* ---------- Events ---------- */
// The five authored events double as the seed for the content store, so the
// admin portal can add to / remove from the same list the site already shows.
// They are stored as real dates (this year), which keeps them "upcoming".
export type EventCategory = 'worship' | 'social' | 'outreach' | 'sports';

export const EVENT_FILTERS: { value: 'all' | EventCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'worship', label: 'Worship' },
  { value: 'social', label: 'Social' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'sports', label: 'Sports' },
];

export type SeedEvent = {
  key: string;
  title: string;
  description: string;
  category: EventCategory;
  /** 0 = January */
  monthIndex: number;
  day: number;
};

export const EVENT_SEED: SeedEvent[] = [
  { key: 's1', monthIndex: 8, day: 14, category: 'worship', title: 'Week of Spiritual Emphasis', description: 'Five nights of revival — 6:30 PM, Main Auditorium.' },
  { key: 's2', monthIndex: 8, day: 21, category: 'social', title: 'Chapter Social Night', description: 'Games, food and fellowship — 5:00 PM, Student Square.' },
  { key: 's3', monthIndex: 8, day: 28, category: 'outreach', title: 'Community Health Outreach', description: 'Free screenings and Bible literature — 8:00 AM, Town Center.' },
  { key: 's4', monthIndex: 9, day: 5, category: 'sports', title: 'Inter-Chapter Football', description: 'GNAAS CCTU vs. GNAAS UCC — 3:00 PM, Sports Pitch.' },
  { key: 's5', monthIndex: 9, day: 18, category: 'worship', title: 'Choir Rehearsal', description: 'Open rehearsal, new voices welcome — 6:00 PM, Chapel.' },
];

const pad2 = (value: number) => String(value).padStart(2, '0');

/** Builds a `datetime-local` string for a seeded event in the given year. */
export const seedEventDate = (event: SeedEvent, year = new Date().getFullYear()) =>
  `${year}-${pad2(event.monthIndex + 1)}-${pad2(event.day)}T09:00`;

export const STATIC_EVENTS = EVENT_SEED.map((event) => ({
  id: `seed-${event.key}`,
  title: event.title,
  description: event.description,
  category: event.category as string,
  eventDate: seedEventDate(event),
}));

/* ---------- Executive team, in hierarchy groups ---------- */
export type Executive = { name: string; role: string; src: string; alt: string };

const exec = (name: string, role: string, path: string, alt = name): Executive => ({
  name,
  role,
  src: path.startsWith('http') ? path : asset(path),
  alt,
});

export const EXECUTIVE_GROUPS: Executive[][] = [
  [
    exec('Mr. Isaac Nyankson', 'President', 'images/Mr.Isaac Nyankson.jpeg'),
    exec('Mr. Kwame Boadu Amoah', 'Vice President', 'images/Mr. Kwame Boadu Amoah.png'),
    exec('Dr. Theophilus Frimpong Adu', 'Patron', 'https://i.ibb.co/8g8qXx1w/Theophilus-Frimpong-Adu-Chaplain.jpg'),
    exec('Miss Sarah Abena Wienu', 'Secretary', 'images/Sarah Abena Wienu Secretary.jpeg'),
  ],
  [
    exec('Mr. Samuel Aidoo', 'Treasurer', 'https://i.ibb.co/HfSyxrxd/Samuel-Aidoo-Treasure.jpg', 'Samuel Aidoo - Treasurer'),
    exec('Mr. Nelson Bayagimbey', 'Coordinator', 'images/Nelson Bayagimbey  Coordinator.jpeg'),
    exec('Miss Tweneboah Jacqueline', 'Deputy Coordinator', 'images/Tweneboah Jacqueline Deputy Coordinator.jpeg'),
    exec('Miss Takyiwaa Vanuella', 'Sabbath School Leader', 'images/Takyiwaa Vanuella Sabbath School leader.jpeg'),
    exec('Mr. Obeng Ernest', 'Youth Leader', 'https://i.ibb.co/6RzhGX89/Obeng-Ernest-Youth-leader.jpg', 'Obeng Ernest - Youth Leader'),
  ],
  [
    exec('Mr. Isaac Apegya', 'Personal Ministry', 'https://i.ibb.co/TBYzQvhJ/Isaac-Apegya-Personal-ministry.jpg', 'Isaac Apegya - Personal Ministry'),
    exec('Mr. Emmanuel Sam', 'Interest Coordinator', 'https://i.ibb.co/1GGxpw8T/Emmanuel-Sam-Interest-coordinator.jpg', 'Emmanuel Sam - Interest Coordinator'),
    exec('Mr. Francis Annu', 'Music Leader', 'images/Francis Annu  Music leader.jpeg'),
    exec('Mr. Stephen Dwamena', 'Media and Publicity', 'images/Stephen Dwamena  Media and publicity.JPG'),
    exec('Mr. Bright Appiah', 'Deacon', 'images/Bright Appiah Deacon.jpeg'),
    exec('Miss Leticia Quansah', 'Deaconess', 'images/Leticia Quansah Deaconess.jpeg'),
    exec('Mr. Enoch Abraham Arthur Newton', 'Event and Project', 'images/Enoch Abraham Arthur Newton  Event and project.jpg'),
  ],
];

/* ---------- Prayer wall ---------- */
export const PRAYER_SMS_NUMBER = '0509511619';

export const INITIAL_PRAYERS = [
  { name: 'Nana', request: 'Praying for strength through exams this semester.' },
  { name: 'Anonymous', request: 'For safe travel home for the holidays.' },
];

/* ---------- Give ---------- */
export const GIVE_OPTIONS = [
  { title: 'Tithe', text: "Return the Lord's tithe." },
  { title: 'Offering', text: 'Support weekly ministry needs.' },
  { title: 'Chapter Dues', text: 'Keep the chapter running smoothly.' },
];

/* ---------- Alumni & community links ---------- */
export const ALUMNI_WHATSAPP = 'https://chat.whatsapp.com/3kEcmHXQ5INL2euYSKOCe5';
export const COMMUNITY_WHATSAPP = 'https://chat.whatsapp.com/LS0VLLXvTgcCGrgi6CJksS';

export const FOOTER_QUICK_LINKS = [
  { href: '#about', label: 'About Us' },
  { href: '#ministries', label: 'Ministries' },
  { href: '#events', label: 'Events' },
  { href: '#give', label: 'Give' },
];

/** Hash route for the admin portal (the original lived at admin.html). */
export const ADMIN_ROUTE = '#/admin';
