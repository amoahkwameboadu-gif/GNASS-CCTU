import { useState } from 'react';
import { EVENT_FILTERS, STATIC_EVENTS } from '../data/site';
import type { ChapterEvent } from '../lib/content';
import { eventDateParts } from '../lib/eventDate';

const CATEGORY_LABELS: Record<string, string> = {
  worship: 'Worship',
  social: 'Social',
  outreach: 'Outreach',
  sports: 'Sports',
};

const tagText = (category: string) => CATEGORY_LABELS[category] ?? (category ? category[0].toUpperCase() + category.slice(1) : '');

/* ============================= EVENTS (filterable) ============================= */
export default function Events({ events }: { events: ChapterEvent[] | null }) {
  const [filter, setFilter] = useState<string>('all');

  // Published events (admin / API) win; the authored list is the fallback.
  const list = events && events.length ? events : STATIC_EVENTS;

  return (
    <section className="section events" id="events">
      <div className="container">
        <p className="eyebrow">Calendar</p>
        <h2>Upcoming events</h2>

        {/* Filter buttons: show/hide matching .event-card elements by category */}
        <div className="filter-bar" role="group" aria-label="Filter events by category">
          {EVENT_FILTERS.map((item) => (
            <button
              key={item.value}
              className={`filter-btn${filter === item.value ? ' is-active' : ''}`}
              data-filter={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="event-list" id="event-list">
          {list.map((event) => {
            const show = filter === 'all' || event.category === filter;
            const parts = eventDateParts(event.eventDate);
            return (
              <article
                className="event-card"
                data-category={event.category}
                key={event.id}
                style={show ? undefined : { display: 'none' }}
              >
                <div className="event-date">
                  <strong>{parts.day}</strong>
                  <span>{parts.month}</span>
                </div>
                <div className="event-info">
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                </div>
                <span className={`tag tag-${event.category}`}>{tagText(event.category)}</span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
