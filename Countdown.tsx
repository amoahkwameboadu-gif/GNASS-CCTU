import { useEffect, useState } from 'react';
import { computeCountdown } from '../lib/ghanaTime';

/* ======================= SIGNATURE: SABBATH COUNTDOWN ======================= */
// Counts down (in Ghana Time) to Friday 6:00 PM, ticking every second.
export default function Countdown() {
  const [state, setState] = useState(computeCountdown);

  useEffect(() => {
    const interval = window.setInterval(() => setState(computeCountdown()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="countdown-strip" aria-label="Sabbath countdown">
      <div className="countdown-inner">
        <div className="countdown-label">
          <span id="countdown-status">{state.status}</span>
        </div>
        <div className="countdown-clock" id="countdown-clock" aria-live="polite">
          <div className="clock-unit"><span id="cd-days">{state.days}</span><small>days</small></div>
          <div className="clock-unit"><span id="cd-hours">{state.hours}</span><small>hrs</small></div>
          <div className="clock-unit"><span id="cd-mins">{state.mins}</span><small>min</small></div>
          <div className="clock-unit"><span id="cd-secs">{state.secs}</span><small>sec</small></div>
        </div>
      </div>
    </section>
  );
}
