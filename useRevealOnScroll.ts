import { useEffect } from 'react';

/* ---------- Smooth scroll reveal animations ---------- */
// Same selectors and IntersectionObserver settings as the original script.js.
const REVEAL_SELECTORS =
  '.section, .latest-card, .schedule-grid, .about-grid, .ministry-grid, .media-row, .live-grid, .video-grid, .resource-row, .team-carousel, .prayer-form, .prayer-list, .give-options, .alumni-inner';

export function useRevealOnScroll() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTORS));

    elements.forEach((element) => {
      element.classList.add('reveal-on-scroll');
      if (element.children.length > 1) element.classList.add('reveal-stagger');
    });

    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-in-view'));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in-view');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );

    elements.forEach((element) => revealObserver.observe(element));
    return () => revealObserver.disconnect();
  }, []);
}
