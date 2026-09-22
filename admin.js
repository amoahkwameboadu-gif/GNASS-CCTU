/* ==========================================================================
   GNAAS CCTU CHAPTER — ADMIN PORTAL
   Interactive content management with live sync to main site
   ========================================================================== */

const statusEl = document.getElementById('admin-status');
const dashboard = document.getElementById('dashboard');
const syncIndicator = document.getElementById('sync-indicator');

// Toast notification system
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" aria-label="Dismiss">&times;</button>
  `;
  container.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => toast.classList.add('show'));
  
  // Auto dismiss
  const timer = setTimeout(() => dismissToast(toast), duration);
  
  toast.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(timer);
    dismissToast(toast);
  });
  
  return toast;
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

function dismissToast(toast) {
  toast.classList.remove('show');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
}

// Sync status indicator
function setSyncStatus(status) {
  if (!syncIndicator) return;
  syncIndicator.className = 'sync-indicator';
  syncIndicator.dataset.status = status;
  const labels = {
    'synced': '✓ Synced',
    'syncing': '⟳ Syncing…',
    'pending': '⏳ Pending',
    'error': '✕ Sync failed'
  };
  syncIndicator.innerHTML = `<span class="sync-dot"></span><span>${labels[status] || status}</span>`;
}

function setStatus(message, error = false) {
  statusEl.textContent = message;
  statusEl.dataset.error = error ? 'true' : 'false';
  showToast(message, error ? 'error' : 'success');
}

// API helper with loading state
async function api(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(`/api/${path}`, { 
      credentials: 'same-origin', 
      signal: controller.signal,
      ...options 
    });
    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') throw new Error('Request timed out');
    throw error;
  }
}

// Loading state helpers
function setLoading(form, loading) {
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = loading;
    submitBtn.innerHTML = loading 
      ? '<span class="spinner"></span> Saving…' 
      : submitBtn.dataset.originalText || 'Save';
  }
  form.classList.toggle('loading', loading);
}

function initFormLoading(form) {
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn && !submitBtn.dataset.originalText) {
    submitBtn.dataset.originalText = submitBtn.innerHTML;
  }
}

// Render functions with enhanced UI
function renderEvents(events) {
  const list = document.getElementById('admin-events');
  list.replaceChildren(...events.map((event) => {
    const item = document.createElement('article');
    item.className = 'admin-event';
    item.innerHTML = `
      <div class="event-info">
        <time>${new Date(event.eventDate).toLocaleDateString('en-GB', { 
          weekday: 'short', day: 'numeric', month: 'short' 
        })}</time>
        <strong>${event.title}</strong>
        <span class="event-category">${event.category}</span>
      </div>
    `;
    const remove = document.createElement('button');
    remove.type = 'button'; 
    remove.className = 'delete-btn';
    remove.innerHTML = '🗑';
    remove.title = 'Delete event';
    remove.addEventListener('click', async () => {
      if (!confirm(`Delete "${event.title}"?`)) return;
      try { 
        const data = await api(`admin/events/${event.id}`, { method: 'DELETE' }); 
        renderEvents(data.events); 
        showToast('Event deleted', 'success');
      } catch (error) { 
        showToast(error.message, 'error'); 
      }
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
    item.innerHTML = `
      <div class="event-info">
        <strong>${update.title}</strong>
        <span class="event-category">${update.mediaType}</span>
      </div>
    `;
    const remove = document.createElement('button');
    remove.type = 'button'; 
    remove.className = 'delete-btn';
    remove.innerHTML = '🗑';
    remove.title = 'Delete media update';
    remove.addEventListener('click', async () => {
      if (!confirm(`Delete "${update.title}"?`)) return;
      try { 
        const data = await api(`admin/media-updates/${update.id}`, { method: 'DELETE' }); 
        renderMediaUpdates(data.mediaUpdates); 
        showToast('Media update deleted', 'success');
      } catch (error) { 
        showToast(error.message, 'error'); 
      }
    });
    item.append(remove);
    return item;
  }));
}

// File upload with drag-and-drop and preview
function setupFileDropZone(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const zone = input.closest('.file-drop-zone') || input.parentElement;
  
  if (!zone.classList.contains('file-drop-zone')) {
    zone.classList.add('file-drop-zone');
  }
  
  ['dragenter', 'dragover'].forEach(evt => {
    zone.addEventListener(evt, e => {
      e.preventDefault(); e.stopPropagation();
      zone.classList.add('drag-over');
    });
  });
  
  ['dragleave', 'drop'].forEach(evt => {
    zone.addEventListener(evt, e => {
      e.preventDefault(); e.stopPropagation();
      zone.classList.remove('drag-over');
    });
  });
  
  zone.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) {
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    
    // Validate file type
    const allowed = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'];
    if (!allowed.includes(file.type)) {
      showToast('Unsupported file type. Use JPEG, PNG, WebP, GIF, MP4, WebM, or MOV.', 'error');
      input.value = '';
      return;
    }
    
    // Check size (25MB)
    if (file.size > 25 * 1024 * 1024) {
      showToast('File too large. Maximum 25 MB.', 'error');
      input.value = '';
      return;
    }
    
    // Show preview
    const url = URL.createObjectURL(file);
    const previewEl = document.createElement(file.type.startsWith('video/') ? 'video' : 'img');
    previewEl.src = url;
    previewEl.controls = file.type.startsWith('video/');
    previewEl.style.maxWidth = '100%';
    previewEl.style.maxHeight = '200px';
    previewEl.style.borderRadius = '8px';
    previewEl.dataset.previewUrl = url;
    
    const container = document.getElementById(`${inputId}-preview`) || preview;
    container.innerHTML = '';
    container.appendChild(previewEl);
    container.style.display = 'block';
    
    showToast(`${file.name} ready to upload`, 'success');
  });
}

// Auto-save drafts to localStorage
function setupAutoSave(formId, fields) {
  const form = document.getElementById(formId);
  const storageKey = `draft_${formId}`;
  
  // Load draft
  const draft = localStorage.getItem(`draft_${formId}`);
  if (draft) {
    try {
      const data = JSON.parse(draft);
      fields.forEach(field => {
        const el = document.getElementById(field);
        if (el && data[field]) el.value = data[field];
      });
      if (confirm('A draft was found. Restore it?')) {
        showToast('Draft restored', 'info');
      }
    } catch (e) {}
  }
  
  // Save on input
  fields.forEach(field => {
    const el = document.getElementById(field);
    if (el) {
      el.addEventListener('input', () => {
        const data = {};
        fields.forEach(f => {
          const el = document.getElementById(f);
          if (el) data[f] = el.value;
        });
        localStorage.setItem(`draft_${formId}`, JSON.stringify(data));
      });
    }
  });
  
  // Clear draft on successful submit
  form.addEventListener('submit', () => {
    localStorage.removeItem(`draft_${formId}`);
  });
}

// Character counter
function setupCharCounter(textareaId, maxLength) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;
  
  const counter = document.createElement('div');
  counter.className = 'char-counter';
  counter.innerHTML = `<span class="current">0</span> / ${maxLength}`;
  textarea.parentElement.appendChild(counter);
  
  const update = () => {
    const len = textarea.value.length;
    counter.querySelector('.current').textContent = len;
    counter.classList.toggle('warning', len > maxLength * 0.9);
    counter.classList.toggle('error', len > maxLength);
  };
  
  textarea.addEventListener('input', update);
  update();
}

// Auto-expand textarea
function setupAutoExpand(textarea) {
  textarea.style.resize = 'none';
  textarea.style.overflow = 'hidden';
  const resize = () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
  };
  textarea.addEventListener('input', resize);
  resize();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + S to save active form
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    const activeForm = document.querySelector('form:focus-within') || document.querySelector('form');
    if (activeForm) {
      const submitBtn = activeForm.querySelector('button[type="submit"]');
      if (submitBtn && !submitBtn.disabled) submitBtn.click();
    }
  }
  
  // Escape to close modals/clear selection
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
    window.getSelection().removeAllRanges();
  }
});

// Sync status polling
function startSyncPolling() {
  setInterval(async () => {
    try {
      const res = await fetch('/api/content', { method: 'HEAD', cache: 'no-cache' });
      setSyncStatus(res.ok ? 'synced' : 'error');
    } catch {
      setSyncStatus('error');
    }
  }, 10000);
}

// Main initialization
async function loadDashboard() {
  try {
    setSyncStatus('syncing');
    const data = await api('admin/content');
    dashboard.hidden = false;
    setSyncStatus('synced');
    
    if (data.latestMessage) {
      document.getElementById('message-title').value = data.latestMessage.title;
      document.getElementById('message-body').value = data.latestMessage.body;
    }
    renderEvents(data.events || []);
    renderMediaUpdates(data.mediaUpdates || []);
    
    // Restore drafts
    setupAutoSave('message-form', ['message-title', 'message-body']);
    setupAutoSave('media-update-form', ['media-update-title', 'media-update-body']);
    setupAutoSave('event-form', ['event-title', 'event-description']);
    
    // Character counters
    setupCharCounter('message-body', 5000);
    setupCharCounter('media-update-body', 2000);
    setupCharCounter('event-description', 1000);
    
    // Auto-expand textareas
    document.querySelectorAll('textarea').forEach(setupAutoExpand);
    
    // File drop zones
    setupFileDropZone('message-file', 'message-file-preview');
    setupFileDropZone('media-update-file', 'media-update-file-preview');
    
    // Initialize form loading states
    document.querySelectorAll('form').forEach(initFormLoading);
    
    // Start sync polling
    startSyncPolling();
    
    setSyncStatus('synced');
    showToast('Dashboard loaded', 'success');
  } catch (error) {
    setSyncStatus('error');
    showToast(error.message, 'error');
  }
}

// Form handlers with enhanced UX
document.getElementById('message-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  setLoading(form, true);
  
  try {
    let mediaUrl, mediaType;
    const file = document.getElementById('message-file').files[0];
    if (file) {
      const formData = new FormData(); formData.append('file', file);
      const uploaded = await api('admin/media', { method: 'POST', body: formData });
      mediaUrl = uploaded.url; mediaType = uploaded.type;
    }
    const data = await api('admin/content', { 
      method: 'PUT', 
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        title: document.getElementById('message-title').value,
        body: document.getElementById('message-body').value, 
        mediaUrl, mediaType 
      }) 
    });
    renderEvents(data.events); 
    renderMediaUpdates(data.mediaUpdates); 
    showToast('✓ Message saved and published to main site', 'success');
    setSyncStatus('synced');
  } catch (error) { 
    showToast(error.message, 'error');
    setSyncStatus('error');
  } finally {
    setLoading(form, false);
  }
});

document.getElementById('media-update-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  setLoading(form, true);
  
  try {
    const file = document.getElementById('media-update-file').files[0];
    if (!file) throw new Error('Choose an image or video first.');
    
    const formData = new FormData(); formData.append('file', file);
    const uploaded = await api('admin/media', { method: 'POST', body: formData });
    
    const data = await api('admin/media-updates', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: document.getElementById('media-update-title').value,
        body: document.getElementById('media-update-body').value,
        mediaUrl: uploaded.url, mediaType: uploaded.type
      })
    });
    renderMediaUpdates(data.mediaUpdates);
    form.reset();
    document.getElementById('media-update-file-preview').innerHTML = '';
    document.getElementById('media-update-file-preview').style.display = 'none';
    showToast('✓ Media update published to main site', 'success');
    setSyncStatus('synced');
  } catch (error) { 
    showToast(error.message, 'error');
    setSyncStatus('error');
  } finally {
    setLoading(form, false);
  }
});

document.getElementById('event-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  setLoading(form, true);
  
  try {
    const data = await api('admin/events', { 
      method: 'POST', 
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        title: document.getElementById('event-title').value,
        description: document.getElementById('event-description').value,
        eventDate: document.getElementById('event-date').value,
        category: document.getElementById('event-category').value 
      }) 
    });
    renderEvents(data.events); 
    form.reset(); 
    showToast('✓ Event added to main site calendar', 'success');
    setSyncStatus('synced');
  } catch (error) { 
    showToast(error.message, 'error');
    setSyncStatus('error');
  } finally {
    setLoading(form, false);
  }
});

// Initialize
loadDashboard().catch((error) => {
  showToast(error.message, 'error');
  setSyncStatus('error');
});