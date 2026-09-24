import About from '../components/About';
import { Alumni, Footer, Give } from '../components/Closing';
import Countdown from '../components/Countdown';
import Events from '../components/Events';
import Header from '../components/Header';
import Hero from '../components/Hero';
import LatestMessage from '../components/LatestMessage';
import LiveHub from '../components/LiveHub';
import Media from '../components/Media';
import Ministries from '../components/Ministries';
import PrayerWall from '../components/PrayerWall';
import Schedule from '../components/Schedule';
import Team from '../components/Team';
import { useChapterContent } from '../hooks/useChapterContent';
import { useRevealOnScroll } from '../hooks/useRevealOnScroll';

/* The public chapter website (was index.html + script.js). */
export default function Home() {
  const content = useChapterContent();
  useRevealOnScroll();

  return (
    <>
      {/* Lets keyboard/screen-reader users jump straight to the content, skipping the nav */}
      <a className="skip-link" href="#main">Skip to main content</a>

      <Header />

      <main id="main">
        <Hero />
        <Countdown />
        <LatestMessage message={content?.latestMessage ?? null} />
        <Schedule />
        <About />
        <Ministries />
        <Media updates={content?.mediaUpdates ?? null} />
        <LiveHub />
        <Events events={content?.events ?? null} />
        <Team />
        <PrayerWall />
        <Give />
        <Alumni />
      </main>

      <Footer />
    </>
  );
}
