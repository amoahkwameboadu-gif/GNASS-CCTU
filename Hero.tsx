import { PIONEERS } from '../data/site';

/* ============================= HERO ============================= */
export default function Hero() {
  return (
    <section className="hero" id="home">
      {/* Public-domain pioneer portraits from Wikimedia Commons, combined into one archival collage. */}
      <div className="hero-media" aria-label="Archival portraits of early Seventh-day Adventist pioneers">
        <div className="pioneer-collage">
          {PIONEERS.map((pioneer) => (
            <img key={pioneer.src} src={pioneer.src} alt={pioneer.alt} />
          ))}
        </div>
        <div className="hero-image-grade" aria-hidden="true"></div>
      </div>
      <div className="hero-content">
        <p className="eyebrow">Ghana National Association of Adventist Students</p>
        <h1>You're welcome home, before you even walk in.</h1>
        <p className="hero-sub">
          GNAAS CCTU is a family of Adventist students at Cape Coast Technical University — worshipping, growing and
          serving together every week.
        </p>
        <div className="hero-ctas">
          <a href="#media" className="btn btn-primary announcements-btn">Announcements</a>
          <a href="#video-section" className="btn btn-ghost">Watch Latest Message</a>
        </div>
      </div>
    </section>
  );
}
