import { LATEST_MESSAGE } from '../data/site';
import type { LatestMessage as LatestMessageData } from '../lib/content';

/* ============================= LATEST MESSAGE ============================= */
// Static by default; the title, body and media are replaced when the admin
// portal publishes a new message (via /api/content or local mode).
export default function LatestMessage({ message }: { message: LatestMessageData | null }) {
  const title = message?.title ?? LATEST_MESSAGE.title;
  const body = message?.body ?? LATEST_MESSAGE.body;

  const mediaUrl = message?.mediaUrl;
  const mediaType = message?.mediaType ?? '';
  const isImage = Boolean(mediaUrl && mediaType.startsWith('image/'));
  const isCustomVideo = Boolean(mediaUrl && mediaType.startsWith('video/'));
  const videoSrc = isCustomVideo ? mediaUrl! : LATEST_MESSAGE.videoSrc;

  return (
    <section className="section latest" id="video-section">
      <div className="container">
        <div className="latest-card">
          <div className="latest-thumb">
            {isImage ? (
              <img src={mediaUrl} alt={title} />
            ) : (
              // key={videoSrc} re-creates the element so a newly published video loads immediately
              <video key={videoSrc} id="latest-media" controls preload="metadata" aria-label="Latest GNAAS message video">
                <source src={videoSrc} type={isCustomVideo ? undefined : 'video/mp4'} />
                Your browser does not support local video playback.
              </video>
            )}
          </div>
          <div className="latest-info">
            <p className="eyebrow">Latest Message</p>
            <h2 id="latest-title">{title}</h2>
            <p className="sermon-title" id="latest-summary">{LATEST_MESSAGE.summary}</p>
            <p id="latest-body">{body}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
