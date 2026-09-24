import type { ImgHTMLAttributes, SyntheticEvent } from 'react';
import { CHURCH_DUES_REEL, PRAYER_MEETING_REEL } from '../data/site';
import type { MediaUpdate } from '../lib/content';
import Slideshow from './Slideshow';

/** <img> that swaps to a backup URL once if the primary file fails to load. */
function FallbackImg({ fallback, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fallback: string }) {
  const onError = (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = 'true';
    img.src = fallback;
  };
  return <img {...props} onError={onError} />;
}

const playIconStyle = { width: 48, height: 48 };

/** The authored reels shown when there are no published media updates. */
function StaticReels() {
  return (
    <>
      {/* Reel 1: Event Highlights Slideshow */}
      <article className="reel-card" id="event-highlights-reel">
        <Slideshow />
        <div className="reel-info">
          <h3>Event Highlights</h3>
          <span>Recent chapter events and activities</span>
        </div>
      </article>

      {/* Reel 2: Church Dues & Welfare */}
      <article className="reel-card">
        <a href={CHURCH_DUES_REEL.href} className="reel-link" aria-label={CHURCH_DUES_REEL.ariaLabel}>
          <div className="reel-thumb">
            <FallbackImg src={CHURCH_DUES_REEL.src} fallback={CHURCH_DUES_REEL.fallback} alt={CHURCH_DUES_REEL.alt} loading="lazy" />
          </div>
          <div className="reel-info">
            <h3>{CHURCH_DUES_REEL.title}</h3>
            <span>{CHURCH_DUES_REEL.subtitle}</span>
          </div>
        </a>
      </article>

      {/* Reel 3: Virtual Prayer Meeting (linked) */}
      <article className="reel-card">
        <a
          href={PRAYER_MEETING_REEL.href}
          target="_blank"
          rel="noopener noreferrer"
          className="reel-link"
          aria-label={PRAYER_MEETING_REEL.ariaLabel}
        >
          <div className="reel-thumb">
            <FallbackImg src={PRAYER_MEETING_REEL.src} fallback={PRAYER_MEETING_REEL.fallback} alt={PRAYER_MEETING_REEL.alt} loading="lazy" />
          </div>
          <div className="reel-info">
            <h3>{PRAYER_MEETING_REEL.title}</h3>
            <span>{PRAYER_MEETING_REEL.subtitle}</span>
          </div>
        </a>
      </article>

      {/* Reel 4: Generic placeholder */}
      <article className="reel-card">
        <div className="reel-thumb" style={{ background: 'var(--yellow)' }}>
          <svg className="reel-play-icon" viewBox="0 0 24 24" aria-hidden="true" style={{ ...playIconStyle, fill: 'var(--charcoal)' }}>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <div className="reel-info">
          <h3>Upcoming Event</h3>
          <span>Stay tuned for details</span>
        </div>
      </article>

      {/* Reel 5: Generic placeholder */}
      <article className="reel-card">
        <div className="reel-thumb" style={{ background: 'var(--royal-deep)' }}>
          <svg className="reel-play-icon" viewBox="0 0 24 24" aria-hidden="true" style={{ ...playIconStyle, fill: 'var(--yellow)' }}>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <div className="reel-info">
          <h3>Share Your Story</h3>
          <span>Submit a reel</span>
        </div>
      </article>

      {/* View More Reels arrow button */}
      <button className="reel-card reel-view-more" type="button" aria-label="View more reels">
        <div className="reel-thumb">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={{ width: 36, height: 36, fill: 'none', stroke: 'var(--yellow)', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
        <div className="reel-info">
          <h3>View More Reels</h3>
          <span>Explore all content</span>
        </div>
      </button>
    </>
  );
}

/** A reel built from a media update published in the admin portal. */
function PublishedReel({ update }: { update: MediaUpdate }) {
  const isVideo = update.mediaType.startsWith('video/');
  return (
    <article className="reel-card">
      <div className="reel-thumb">
        {isVideo ? (
          <video src={update.mediaUrl} controls preload="metadata" aria-label={update.title} />
        ) : (
          <img src={update.mediaUrl} alt={update.title} loading="lazy" />
        )}
      </div>
      <div className="reel-info">
        <h3>{update.title}</h3>
        <span>{update.body || 'GNAAS CCTU update'}</span>
      </div>
    </article>
  );
}

/* ============================= MEDIA (reels row) ============================= */
export default function Media({ updates }: { updates: MediaUpdate[] | null }) {
  // Keep the authored reels when records are missing, malformed or unsupported.
  const published = (updates ?? []).filter(
    (update) =>
      typeof update.mediaUrl === 'string' &&
      typeof update.mediaType === 'string' &&
      (update.mediaType.startsWith('image/') || update.mediaType.startsWith('video/')),
  );

  return (
    <section className="section media" id="media">
      <div className="container">
        <p className="eyebrow">Media</p>
        <h2>Sermons and Announcements</h2>
        <p className="section-sub">Explore our latest media highlights, featured announcements, and community reels below.</p>

        {/* Reels horizontal scroll (YouTube Shorts style) */}
        <div className="reels-row" id="media-updates-list" tabIndex={0} aria-label="Community reels, scroll horizontally">
          {published.length ? published.map((update) => <PublishedReel key={update.id ?? update.mediaUrl} update={update} />) : <StaticReels />}
        </div>
      </div>
    </section>
  );
}
