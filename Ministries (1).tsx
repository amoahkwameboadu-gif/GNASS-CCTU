import { MINISTRIES } from '../data/site';

/* ============================= MINISTRIES ============================= */
export default function Ministries() {
  return (
    <section className="section ministries" id="ministries">
      <div className="container">
        <p className="eyebrow">Get Involved</p>
        <h2>Ministries &amp; departments</h2>

        {/* Grid: cards reflow automatically at any screen width */}
        <div className="ministry-grid">
          {MINISTRIES.map((ministry) => (
            <article className="ministry-card" key={ministry.title}>
              <div className="ministry-icon" aria-hidden="true">{ministry.icon}</div>
              <h3>{ministry.title}</h3>
              <p>{ministry.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
