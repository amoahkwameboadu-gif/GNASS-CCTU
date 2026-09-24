import { useEffect, useState } from 'react';
import { SLIDESHOW_IMAGES, SLIDE_DURATION } from '../data/site';

/* ============================= EVENT HIGHLIGHTS SLIDESHOW (first reel) ============================= */
// Automatic image slideshow that cycles through images/slideshows/ with a
// smooth sliding transition. Pauses while hovered; dots jump to a slide.
export default function Slideshow() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = SLIDESHOW_IMAGES.length;

  useEffect(() => {
    if (paused) return;
    const interval = window.setInterval(() => setCurrentSlide((index) => (index + 1) % total), SLIDE_DURATION);
    return () => window.clearInterval(interval);
  }, [paused, total]);

  const goToSlide = (index: number) => {
    if (index < 0) index = total - 1;
    if (index >= total) index = 0;
    setCurrentSlide(index);
  };

  return (
    <div
      className="reel-thumb slideshow-container"
      aria-label="Event Highlights slideshow"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="slideshow-track" id="slideshow-track" style={{ transform: `translateX(${-currentSlide * 100}%)` }}>
        {SLIDESHOW_IMAGES.map((src, index) => (
          <div className="slideshow-slide" key={src}>
            <img src={src} alt={`Event Highlight ${index + 1}`} loading="lazy" />
          </div>
        ))}
      </div>
      <div className="slideshow-indicators" id="slideshow-indicators" aria-label="Slide indicators">
        {SLIDESHOW_IMAGES.map((src, index) => (
          <button
            key={src}
            className={`slideshow-indicator${index === currentSlide ? ' active' : ''}`}
            aria-label={`Go to slide ${index + 1}`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>
    </div>
  );
}
