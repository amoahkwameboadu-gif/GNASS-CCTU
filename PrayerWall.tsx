import { useState, type FormEvent } from 'react';
import { INITIAL_PRAYERS, PRAYER_SMS_NUMBER } from '../data/site';

type Prayer = { id: string; name: string; request: string };

/* ============================= PRAYER WALL ============================= */
// Adds a new request card to the top of the list when the form is submitted,
// then opens the visitor's SMS app with the prayer request pre-filled.
export default function PrayerWall() {
  const [prayers, setPrayers] = useState<Prayer[]>(() =>
    INITIAL_PRAYERS.map((prayer, index) => ({ ...prayer, id: `initial-${index}` })),
  );
  const [name, setName] = useState('');
  const [request, setRequest] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const prayerName = name.trim() || 'Anonymous';
    const prayerRequest = request.trim();
    if (!prayerRequest) return;

    // Create prayer request text for SMS
    const prayerRequestText = `Prayer Request from ${prayerName}:\n${prayerRequest}`;

    // Add to local prayer list immediately
    setPrayers((list) => [{ id: `${Date.now()}`, name: prayerName, request: prayerRequest }, ...list]);
    setName('');
    setRequest('');

    // Trigger SMS protocol
    window.location.href = `sms:${PRAYER_SMS_NUMBER}?body=${encodeURIComponent(prayerRequestText)}`;
  };

  return (
    <section className="section prayer" id="prayer">
      <div className="container">
        <div className="prayer-wrapper">
          <div className="prayer-intro">
            <p className="eyebrow">Prayer Wall</p>
            <h2>Share a Request</h2>
            <p className="section-sub">
              We'd love to pray with you. Submit your request below and our team will lift it up in prayer.
            </p>
          </div>

          <form className="prayer-form" id="prayer-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="prayer-name">Your Name <span className="optional">(optional)</span></label>
                <input
                  type="text"
                  id="prayer-name"
                  name="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="prayer-request">Prayer Request <span className="required">*</span></label>
              <textarea
                id="prayer-request"
                name="request"
                rows={5}
                placeholder="Please share what you'd like us to pray for..."
                required
                value={request}
                onChange={(event) => setRequest(event.target.value)}
              ></textarea>
            </div>
            <button type="submit" className="btn btn-primary submit-btn">
              <span className="btn-text">Submit via SMS</span>
              <span className="btn-icon" aria-hidden="true">📱</span>
            </button>
          </form>

          <div className="prayer-divider">
            <span>Recent Prayers</span>
          </div>

          <ul className="prayer-list" id="prayer-list" aria-live="polite">
            {prayers.map((prayer) => (
              <li className="prayer-item" key={prayer.id}>
                <strong>{prayer.name}</strong>
                <p>{prayer.request}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
