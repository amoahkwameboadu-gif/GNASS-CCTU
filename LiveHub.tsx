import { memo, useEffect, useState } from 'react';
import { ANN_RSS_URL, ANN_SITE, RESOURCES, SABBATH_SCHOOL_URL, THREE_ABN_URL, TIKTOK_PROFILE } from '../data/site';

/* ---------- Live Adventist News Network feed ---------- */
// ANN publishes the source RSS. The public proxy only converts RSS to JSON so
// browsers can read it; each item still links back to adventist.news.
const ANN_PROXY_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(ANN_RSS_URL)}`;

type Story = { title: string; link: string; pubDate?: string };
type FeedState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; stories: Story[] };

function useAnnFeed(): FeedState {
  const [feed, setFeed] = useState<FeedState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function loadAnnFeed() {
      try {
        const response = await fetch(ANN_PROXY_URL, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`ANN feed request failed: ${response.status}`);
        const data = await response.json();
        const stories: Story[] = (data.items || []).slice(0, 5);
        if (!stories.length) throw new Error('ANN feed returned no stories');
        if (!cancelled) setFeed({ status: 'ready', stories });
      } catch {
        if (!cancelled) setFeed({ status: 'error' });
      }
    }

    loadAnnFeed();
    const interval = window.setInterval(loadAnnFeed, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return feed;
}

/* ---------- TikTok creator embed ---------- */
// The embed script replaces the blockquote with an iframe, so the markup is
// injected as raw HTML (React never reconciles it) and the script is
// (re)loaded after mount so it always finds the blockquote.
const TIKTOK_MARKUP = `<blockquote class="tiktok-embed" cite="${TIKTOK_PROFILE}" data-unique-id="hopechannelgh" data-embed-type="creator" style="max-width: 780px; min-width: 288px;"><section><a href="${TIKTOK_PROFILE}" target="_blank" rel="noopener noreferrer">View Hope Channel Ghana Board on TikTok</a></section></blockquote>`;

const TikTokEmbed = memo(function TikTokEmbed() {
  useEffect(() => {
    document.getElementById('tiktok-embed-script')?.remove();
    const script = document.createElement('script');
    script.id = 'tiktok-embed-script';
    script.async = true;
    script.src = 'https://www.tiktok.com/embed.js';
    document.body.appendChild(script);
  }, []);

  return <div className="tiktok-embed-wrap" dangerouslySetInnerHTML={{ __html: TIKTOK_MARKUP }} />;
});

/* ============================= SDA LIVE HUB ============================= */
export default function LiveHub() {
  const feed = useAnnFeed();

  return (
    <section className="section live-hub" id="live">
      <div className="container">
        <p className="eyebrow">SDA Live</p>
        <h2>Stay connected to the church</h2>
        <p className="section-sub">
          Live news, Sabbath School study and trusted Adventist resources, refreshed from their official platforms.
        </p>

        <div className="live-grid">
          <article className="live-panel ann-panel">
            <div className="panel-heading">
              <div>
                <span className="live-dot" aria-hidden="true"></span>
                <span className="eyebrow">Adventist News Network</span>
              </div>
              <a href={ANN_SITE} target="_blank" rel="noopener noreferrer">ANN <span aria-hidden="true">↗</span></a>
            </div>
            <div id="ann-feed" className="feed-list" aria-live="polite">
              {feed.status === 'loading' && <p className="feed-status">Loading the latest church news...</p>}
              {feed.status === 'error' && (
                <p className="feed-status">
                  The live feed is temporarily unavailable. <a href={ANN_SITE} target="_blank" rel="noopener noreferrer">Read the latest ANN stories ↗</a>
                </p>
              )}
              {feed.status === 'ready' &&
                feed.stories.map((story) => (
                  <article className="feed-item" key={story.link}>
                    <a href={story.link} target="_blank" rel="noopener noreferrer">{story.title}</a>
                    <time dateTime={story.pubDate || ''}>
                      {story.pubDate ? new Date(story.pubDate).toLocaleDateString() : 'Latest update'}
                    </time>
                  </article>
                ))}
            </div>
          </article>

          <article className="live-panel lesson-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Sabbath School</span>
                <span className="source-label">Live quarterly study</span>
              </div>
            </div>
            <div className="lesson-frame-wrap">
              <iframe
                src={SABBATH_SCHOOL_URL}
                title="Sabbath School Quarterly Lesson"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                style={{ width: '100%', maxWidth: 300, aspectRatio: '3/4', border: 'none' }}
              ></iframe>
            </div>
          </article>
        </div>

        <div className="video-grid">
          <article className="video-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Short videos</span>
                <span className="source-label">Hope Channel Ghana Board</span>
              </div>
              <a href={TIKTOK_PROFILE} target="_blank" rel="noopener noreferrer">TikTok <span aria-hidden="true">↗</span></a>
            </div>
            <TikTokEmbed />
          </article>

          <article className="video-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Weekly study video</span>
                <span className="source-label">3ABN Sabbath School Panel</span>
              </div>
              <a href={THREE_ABN_URL} target="_blank" rel="noopener noreferrer">3ABN <span aria-hidden="true">↗</span></a>
            </div>
            <div className="threeabn-frame-wrap">
              <iframe
                src={THREE_ABN_URL}
                title="3ABN Sabbath School Panel latest lesson"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              ></iframe>
            </div>
            <a className="video-fallback-link" href={THREE_ABN_URL} target="_blank" rel="noopener noreferrer">
              Open the latest 3ABN Sabbath School Panel lesson ↗
            </a>
          </article>
        </div>

        <div className="resource-row" aria-label="Official Adventist resources">
          {RESOURCES.map((resource) => (
            <a className="resource-link" key={resource.href} href={resource.href} target="_blank" rel="noopener noreferrer">
              <strong>{resource.title}</strong>
              <span>{resource.text}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
