import { ABOUT_STATS } from '../data/site';

/* ============================= ABOUT ============================= */
export default function About() {
  return (
    <section className="section about" id="about">
      <div className="container about-grid">
        <div>
          <p className="eyebrow">About Us</p>
          <h2>A chapter, and a home</h2>
          <p>
            GNAAS CCTU exists to help Adventist students grow spiritually, academically and socially during their time
            on campus. We meet weekly, serve our wider campus community, and walk with students from freshers' week to
            graduation.
          </p>
          <p>Chapter dues and offerings keep our ministries running — see the Give section below for how to support us.</p>
        </div>
        <div className="about-stats">
          {ABOUT_STATS.map((stat) => (
            <div className="stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
