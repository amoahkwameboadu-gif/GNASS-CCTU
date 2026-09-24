import { useEffect, useState } from 'react';
import { fetchPublicContent, subscribeToContentChanges, type ChapterContent } from '../lib/content';

/* ---------- Dynamic Content Loading (Vercel API) ---------- */
// Fetches latest content from the public API and updates the page dynamically.
// Runs on load and polls every 30 seconds for live updates. When the API is
// unavailable, content published from the admin portal in this browser
// (local mode) is used instead. Otherwise the static content stays in place.
export function useChapterContent(): ChapterContent | null {
  const [content, setContent] = useState<ChapterContent | null>(null);

  useEffect(() => {
    let cancelled = false;
    let lastSnapshot = '';

    async function loadChapterContent() {
      try {
        const data = await fetchPublicContent();
        if (cancelled || !data) return;
        const snapshot = JSON.stringify(data);
        if (snapshot === lastSnapshot) return; // nothing changed — avoid re-rendering media
        lastSnapshot = snapshot;
        setContent(data);
      } catch (error) {
        console.warn('Content load failed, using static fallback:', error);
      }
    }

    // Coming back to the tab should never show stale content
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadChapterContent();
    };

    // Initial load
    loadChapterContent();
    // Auto-refresh every 30 seconds for live updates
    const interval = window.setInterval(loadChapterContent, 30 * 1000);
    // Instant refresh when the admin portal publishes in another tab
    const unsubscribeContent = subscribeToContentChanges(loadChapterContent);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      unsubscribeContent();
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return content;
}
