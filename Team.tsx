import { useState } from 'react';
import { EXECUTIVE_GROUPS } from '../data/site';

/* ============================= EXECUTIVE TEAM ============================= */
// Executives are shown in hierarchy groups; "View More" cycles through them
// and the last group offers "Return to Core".
export default function Team() {
  const [groupIndex, setGroupIndex] = useState(0);
  const isLastGroup = groupIndex === EXECUTIVE_GROUPS.length - 1;

  return (
    <section className="section team" id="team">
      <div className="container">
        <p className="eyebrow">Leadership</p>
        <h2>Meet Your Executives</h2>
        <div className="team-carousel" aria-live="polite">
          {EXECUTIVE_GROUPS.map((group, index) => (
            <div
              key={index}
              className={`team-grid team-grid-group${index === groupIndex ? ' is-visible' : ''}`}
              hidden={index !== groupIndex}
            >
              {group.map((member) => (
                <article className="team-card" key={member.name}>
                  <img className="team-photo" src={member.src} alt={member.alt} />
                  <h3>{member.name}</h3>
                  <span>{member.role}</span>
                </article>
              ))}
            </div>
          ))}
        </div>
        <button
          className="view-more-btn"
          id="view-more-executives"
          type="button"
          aria-expanded={isLastGroup}
          aria-label={isLastGroup ? 'Return to core executives' : 'Show next executive group'}
          onClick={() => setGroupIndex((index) => (index + 1) % EXECUTIVE_GROUPS.length)}
        >
          {isLastGroup ? (
            <>Return to Core <span aria-hidden="true">↺</span></>
          ) : (
            <>View More <span aria-hidden="true">+</span></>
          )}
        </button>
      </div>
    </section>
  );
}
