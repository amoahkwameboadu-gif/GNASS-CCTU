import { useEffect, useState } from 'react';
import { SCHEDULE } from '../data/site';
import { getCurrentScheduleIndex } from '../lib/ghanaTime';

/* ============================= SERVICE SCHEDULE ============================= */
// Weekly Schedule — dynamic activity highlighting (Ghana Time).
// The card for the activity happening right now gets the "current" class;
// if nothing is ongoing, no card is highlighted.
export default function Schedule() {
  const [current, setCurrent] = useState(getCurrentScheduleIndex);

  useEffect(() => {
    // Re-check every 30 seconds to keep in sync
    const interval = window.setInterval(() => setCurrent(getCurrentScheduleIndex()), 30 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="section schedule" id="schedule">
      <div className="container">
        <p className="eyebrow">This Week</p>
        <h2>Where to find us</h2>

        {/* A simple responsive grid of service cards */}
        <div className="schedule-grid">
          {SCHEDULE.map((item, index) => (
            <div key={item.title} className={`schedule-card${index === current ? ' current' : ''}`}>
              <span className="schedule-day">{item.day}</span>
              <h3>{item.title}</h3>
              <p className="schedule-time">{item.time}</p>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
