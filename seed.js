/* ==========================================================================
   Seed content for the backend, kept in step with src/data/site.ts.
   Event dates are rebuilt from month/day each year so the calendar is always
   showing upcoming events.
   ========================================================================== */

const SEED_EVENTS = [
  { id: 'seed-s1', month: 8, day: 14, category: 'worship', title: 'Week of Spiritual Emphasis', description: 'Five nights of revival — 6:30 PM, Main Auditorium.' },
  { id: 'seed-s2', month: 8, day: 21, category: 'social', title: 'Chapter Social Night', description: 'Games, food and fellowship — 5:00 PM, Student Square.' },
  { id: 'seed-s3', month: 8, day: 28, category: 'outreach', title: 'Community Health Outreach', description: 'Free screenings and Bible literature — 8:00 AM, Town Center.' },
  { id: 'seed-s4', month: 9, day: 5, category: 'sports', title: 'Inter-Chapter Football', description: 'GNAAS CCTU vs. GNAAS UCC — 3:00 PM, Sports Pitch.' },
  { id: 'seed-s5', month: 9, day: 18, category: 'worship', title: 'Choir Rehearsal', description: 'Open rehearsal, new voices welcome — 6:00 PM, Chapel.' },
];

const pad2 = (value) => String(value).padStart(2, '0');

/** Builds the seeded content object (same shape as /api/content). */
export function buildSeedContent(year = new Date().getFullYear()) {
  return {
    latestMessage: null,
    events: SEED_EVENTS.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      eventDate: `${year}-${pad2(event.month + 1)}-${pad2(event.day)}T09:00`,
    })),
    mediaUpdates: [],
  };
}

export function normalizeContent(data) {
  return {
    latestMessage: data?.latestMessage ?? null,
    events: Array.isArray(data?.events) ? data.events : [],
    mediaUpdates: Array.isArray(data?.mediaUpdates) ? data.mediaUpdates : [],
  };
}

export function sortEvents(events) {
  return [...events].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}
