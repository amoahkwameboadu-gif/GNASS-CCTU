const statusEl = document.getElementById('admin-status');
const loginPanel = document.getElementById('login-panel');
const dashboard = document.getElementById('dashboard');
const setStatus = (message, error = false) => {
  statusEl.textContent = message;
  statusEl.dataset.error = error ? 'true' : 'false';
};

async function api(path, options = {}) {
  const response = await fetch(`/api/${path}`, { credentials: 'same-origin', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function renderEvents(events) {
  const list = document.getElementById('admin-events');
  list.replaceChildren(...events.map((event) => {
    const item = document.createElement('article');
    item.className = 'admin-event';
    item.textContent = `${event.eventDate} — ${event.title} (${event.category})`;
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = 'Delete';
    remove.addEventListener('click', async () => {
      try { const data = await api(`admin/events/${event.id}`, { method: 'DELETE' }); renderEvents(data.events); }
      catch (error) { setStatus(error.message, true); }
    });
    item.append(remove);
    return item;
  }));
}

function renderMediaUpdates(updates) {
  const list = document.getElementById('admin-media-updates');
  list.replaceChildren(...updates.map((update) => {
    const item = document.createElement('article');
    item.className = 'admin-event';
    item.textContent = `${update.title} (${update.mediaType})`;
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = 'Delete';
    remove.addEventListener('click', async () => {
      try {
        const data = await api(`admin/media-updates/${update.id}`, { method: 'DELETE' });
        renderMediaUpdates(data.mediaUpdates);
      } catch (error) { setStatus(error.message, true); }
    });
    item.append(remove);
    return item;
  }));
}

async function loadDashboard() {
  const data = await api('admin/content');
  loginPanel.hidden = true; dashboard.hidden = false;
  if (data.latestMessage) {
    document.getElementById('message-title').value = data.latestMessage.title;
    document.getElementById('message-body').value = data.latestMessage.body;
  }
  renderEvents(data.events);
  renderMediaUpdates(data.mediaUpdates);
}

document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api('auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: document.getElementById('password').value }) });
    await loadDashboard(); setStatus('Signed in.');
  } catch (error) { setStatus(error.message, true); }
});

document.getElementById('logout').addEventListener('click', async () => {
  await api('auth/logout', { method: 'POST' }); dashboard.hidden = true; loginPanel.hidden = false; setStatus('Signed out.');
});

document.getElementById('message-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    let mediaUrl; let mediaType;
    const file = document.getElementById('message-file').files[0];
    if (file) {
      const form = new FormData(); form.append('file', file);
      const uploaded = await api('admin/media', { method: 'POST', body: form });
      mediaUrl = uploaded.url; mediaType = uploaded.type;
    }
    const data = await api('admin/content', { method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: document.getElementById('message-title').value,
        body: document.getElementById('message-body').value, mediaUrl, mediaType }) });
    renderEvents(data.events); renderMediaUpdates(data.mediaUpdates); setStatus('Message saved.');
  } catch (error) { setStatus(error.message, true); }
});

document.getElementById('media-update-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const file = document.getElementById('media-update-file').files[0];
    if (!file) throw new Error('Choose an image or video first.');
    const form = new FormData(); form.append('file', file);
    const uploaded = await api('admin/media', { method: 'POST', body: form });
    const data = await api('admin/media-updates', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: document.getElementById('media-update-title').value,
        body: document.getElementById('media-update-body').value,
        mediaUrl: uploaded.url, mediaType: uploaded.type
      })
    });
    renderMediaUpdates(data.mediaUpdates);
    event.target.reset();
    setStatus('Media update published.');
  } catch (error) { setStatus(error.message, true); }
});

document.getElementById('event-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await api('admin/events', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: document.getElementById('event-title').value,
        description: document.getElementById('event-description').value,
        eventDate: document.getElementById('event-date').value,
        category: document.getElementById('event-category').value }) });
    renderEvents(data.events); event.target.reset(); setStatus('Event added.');
  } catch (error) { setStatus(error.message, true); }
});

loadDashboard().catch((error) => {
  if (error.message === 'Unauthorized') setStatus('Enter the admin password to continue.');
  else setStatus(error.message, true);
});
