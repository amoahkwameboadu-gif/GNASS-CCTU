import { useEffect, useRef, useState } from 'react';
import Admin from './pages/Admin';
import Home from './pages/Home';

/*
 * Tiny hash router.
 *   #/admin            -> Admin portal (was admin.html)
 *   anything else      -> Public site (section anchors like #about keep working)
 * Hash routing works on any static host, including a single-file build.
 */
type Route = 'home' | 'admin';

const getRoute = (): Route => (window.location.hash.startsWith('#/admin') ? 'admin' : 'home');

export default function App() {
  const [route, setRoute] = useState<Route>(getRoute);
  const firstRender = useRef(true);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // After switching pages (or loading with a section hash), land in the right place.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (route === 'home' && id && !id.startsWith('/')) {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView();
        firstRender.current = false;
        return;
      }
    }
    if (!firstRender.current) window.scrollTo(0, 0);
    firstRender.current = false;
  }, [route]);

  return route === 'admin' ? <Admin /> : <Home />;
}
