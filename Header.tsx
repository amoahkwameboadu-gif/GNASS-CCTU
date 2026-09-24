import { useEffect, useState } from 'react';
import { LOGO_ALT, LOGO_SRC, NAV_LINKS } from '../data/site';
import { useTheme } from '../hooks/useTheme';

/* ============================= HEADER / NAV ============================= */
// position: sticky keeps this bar visible as the visitor scrolls down the page
export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const [shadow, setShadow] = useState<string>();

  /* Header shadow on scroll (small visual polish) */
  useEffect(() => {
    const onScroll = () =>
      setShadow(window.scrollY > 8 ? '0 4px 18px rgba(0,0,0,0.18)' : '0 2px 12px rgba(0,0,0,0.12)');
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isDark = theme === 'dark';

  return (
    <header className="site-header" id="site-header" style={shadow ? { boxShadow: shadow } : undefined}>
      <div className="nav-inner">
        <a href="#home" className="brand">
          <img className="brand-logo" src={LOGO_SRC} alt={LOGO_ALT} />
          <span className="brand-name">GNAAS <span>CCTU</span></span>
        </a>

        {/* 5 links max, per the nav brief */}
        <nav className={`main-nav${navOpen ? ' is-open' : ''}`} id="main-nav" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            // Close the menu automatically once a visitor taps a link.
            <a key={link.href} href={link.href} onClick={() => setNavOpen(false)}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
          {/* Dark mode toggle: flips a data-theme attribute on <html> */}
          <button
            id="theme-toggle"
            className="icon-btn"
            type="button"
            aria-pressed={isDark}
            aria-label={isDark ? 'Turn off dark mode' : 'Turn on dark mode'}
            onClick={toggleTheme}
          >
            <svg className="icon icon-sun" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4.5" />
              <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
            </svg>
            <svg className="icon icon-moon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.8 6.8 0 0 0 20 14.5Z" />
            </svg>
          </button>

          <a href="#give" className="btn btn-cta">Give</a>

          {/* Hamburger button, only shown on small screens (see CSS) */}
          <button
            id="nav-toggle"
            className="icon-btn nav-toggle"
            type="button"
            aria-expanded={navOpen}
            aria-controls="main-nav"
            aria-label="Open menu"
            onClick={() => setNavOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
