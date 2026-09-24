import {
  ADMIN_ROUTE,
  ALUMNI_WHATSAPP,
  COMMUNITY_WHATSAPP,
  FOOTER_QUICK_LINKS,
  GIVE_OPTIONS,
  LOGO_ALT,
  LOGO_SRC,
} from '../data/site';

/* ============================= GIVE ============================= */
export function Give() {
  return (
    <section className="section give" id="give">
      <div className="container give-inner">
        <p className="eyebrow">Give</p>
        <h2>Tithes, offerings &amp; chapter dues</h2>
        <p>Your giving keeps GNAAS CCTU's ministries running — from welfare support to outreach programs.</p>
        <div className="give-options">
          {GIVE_OPTIONS.map((option) => (
            <a href="#" className="give-card" key={option.title}>
              <h3>{option.title}</h3>
              <p>{option.text}</p>
            </a>
          ))}
        </div>
        <p className="give-note">Secure online giving is coming soon. For now, please see an executive member after service.</p>
      </div>
    </section>
  );
}

/* ============================= ALUMNI ============================= */
export function Alumni() {
  return (
    <section className="section alumni" id="alumni">
      <div className="container alumni-inner">
        <div>
          <p className="eyebrow">Alumni</p>
          <h2>Once GNAAS, always GNAAS</h2>
          <p>
            Stay connected with the chapter you grew in. Join the alumni network to hear about homecoming, mentor
            current students, and give back.
          </p>
        </div>
        <a href={ALUMNI_WHATSAPP} className="btn btn-primary whatsapp-btn" target="_blank" rel="noopener noreferrer">
          <span aria-hidden="true">◉</span> Join Alumni WhatsApp
        </a>
      </div>
    </section>
  );
}

/* ============================= FOOTER ============================= */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <img className="brand-logo" src={LOGO_SRC} alt={LOGO_ALT} />
          <p>
            GNAAS CCTU Chapter
            <br />
            Cape Coast Technical University
          </p>
        </div>
        <div>
          <h4>Quick Links</h4>
          {FOOTER_QUICK_LINKS.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </div>
        <div>
          <h4>Connect</h4>
          <a href="#">Instagram</a>
          <a href="#">Facebook</a>
          <a className="whatsapp-footer-link" href={COMMUNITY_WHATSAPP} target="_blank" rel="noopener noreferrer">
            GNAAS CCTU COMMUNITY
          </a>
          <a href={ADMIN_ROUTE}>Admin portal</a>
        </div>
      </div>
      {/* Keeps the copyright year correct forever, without editing by hand. */}
      <p className="footer-copy">
        © <span id="year">{new Date().getFullYear()}</span> GNAAS CCTU Chapter. <strong>Builders for Christ</strong>.
      </p>
    </footer>
  );
}
