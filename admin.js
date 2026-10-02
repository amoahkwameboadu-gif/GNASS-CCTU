/* ==========================================================================
   GNAAS CCTU CHAPTER — ADMIN PORTAL
   Interactive content management with live sync to main site
   ========================================================================== */

const statusEl = document.getElementById('admin-status');
const dashboard = document.getElementById('dashboard');
const syncIndicator = document.getElementById('sync-indicator');
const loginForm = document.getElementById('admin-login-form');
const loginMessage = document.getElementById('admin-login-message');
const signoutButton = document.getElementById('admin-signout');
const usernameInput = document.getElementById('admin-username');
const passwordInput = document.getElementById('admin-password');
const submitButton = document.getElementById('admin-submit');
const modeToggle = document.getElementById('admin-mode-toggle');
const authHeading = document.getElementById('admin-auth-heading');
const authHint = document.getElementById('admin-auth-hint');
let dashboardInitialized = false;
let authMode = 'login';
let currentUser = null;

function applyAuthMode() {
  const registering = authMode === 'register';
  if (authHeading) authHeading.textContent = registering ? 'Create your account' : 'Admin sign in';
  if (authHint) {
    authHint.textContent = registering
      ? 'Pick a username and password. You will be signed in right away.'
      : 'Chapter editors sign in here to update the public site.';
  }
  if (submitButton) submitButton.textContent = registering ? 'Create account' : 'Sign in';
  if (modeToggle) {
    modeToggle.textContent = registering
      ? 'Already have an account? Sign in'
      : 'New here? Create an account';
  }
  if (passwordInput) {
    passwordInput.autocomplete = registering ? 'new-password' : 'current-password';
    passwordInput.placeholder = registering ? 'At least 8 characters' : 'Your password';
  }
}

// Toast notification system
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  const messageElement = document.createElement('span');
  messageElement.className = 'toast-message';
  messageElement.textContent = message;
  const closeButton = document.createElement('button');
  closeButton.className = 'toast-close';
  closeButton.setAttribute('aria-label', 'Dismiss');
  closeButton.textContent = '×';
  toast.append(icon, messageElement, closeButton);
  container.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => toast.classList.add('show'));
  
  // Auto dismiss
  const timer = setTimeout(() => dismissToast(toast), duration);
  
  closeButton.addEventListener('click', () => {
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

// Sync status indicator with detailed error reporting
function setSyncStatus(status, errorDetails = null) {
  if (!syncIndicator) return;
  syncIndicator.className = 'sync-indicator';
  syncIndicator.dataset.status = status;
  
  let label = '';
  
  if (status === 'synced') {
    label = '✓ Synced';
  } else if (status === 'syncing') {
    label = '⟳ Syncing…';
  } else if (status === 'pending') {
    label = '⏳ Pending';
  } else if (status === 'error') {
    label = '✕ Sync failed';
  }

  const retryButton = syncIndicator.querySelector('#sync-retry');
  const dot = document.createElement('span');
  dot.className = 'sync-dot';
  const labelElement = document.createElement('span');
  labelElement.textContent = label;
  syncIndicator.replaceChildren(dot, labelElement);

  if (errorDetails) {
    const detailButton = document.createElement('button');
    detailButton.className = 'sync-error-detail';
    detailButton.type = 'button';
    detailButton.setAttribute('aria-label', 'Show error details');
    detailButton.textContent = 'Details';
    const tooltip = document.createElement('div');
    tooltip.className = 'sync-error-tooltip';
    tooltip.textContent = errorDetails;
    detailButton.addEventListener('click', (event) => {
      event.stopPropagation();
      tooltip.classList.toggle('show');
    });
    document.addEventListener('click', () => tooltip.classList.remove('show'), { once: true });
    syncIndicator.append(detailButton, tooltip);
  }

  if (retryButton) syncIndicator.append(retryButton);
}

function setStatus(message, error = false) {
  statusEl.textContent = message;
  statusEl.dataset.error = error ? 'true' : 'false';
  showToast(message, error ? 'error' : 'success');
}

function showLogin(message = '') {
  dashboard.hidden = true;
  loginForm.hidden = false;
  signoutButton.hidden = true;
  currentUser = null;
  if (usernameInput) usernameInput.disabled = false;
  if (passwordInput) passwordInput.value = '';
  loginMessage.textContent = message;
  if (message) setSyncStatus('error', message);
  else setSyncStatus('pending');
}

function showDashboardFor(user) {
  currentUser = user;
  loginMessage.textContent = '';
  if (usernameInput) usernameInput.disabled = true;
  setSyncStatus('synced');
  const identity = document.getElementById('admin-identity');
  if (identity) identity.textContent = user ? `Signed in as ${user.username}` : '';
}

// API helper with loading state
async function api(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const headers = new Headers(options.headers || {});
    const response = await fetch(`/api/${path}`, {
      credentials: 'same-origin',
      signal: controller.signal,
      ...options,
      headers,
    });
    clearTimeout(timeoutId);
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      throw new Error(`API request failed (HTTP ${response.status}). The server did not return JSON; check the Vercel function configuration and logs.`);
    }
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        showLogin(data.error || 'Your session expired. Sign in again.');
      }
      const error = new Error(data.error || `Request failed (HTTP ${response.status})`);
      error.status = response.status;
      throw error;
    }
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
    const info = document.createElement('div');
    info.className = 'event-info';
    const date = document.createElement('time');
    date.textContent = new Date(event.eventDate).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
    const title = document.createElement('strong');
    title.textContent = event.title;
    const category = document.createElement('span');
    category.className = 'event-category';
    category.textContent = event.category;
    info.append(date, title, category);
    item.append(info);
    const remove = document.createElement('button');
    remove.type = 'button'; 
    remove.className = 'delete-btn';
    remove.innerHTML = '🗑';
    remove.title = 'Delete event';
    remove.addEventListener('click', async () => {
      if (!confirm(`Delete "${event.title}"?`)) return;
      try { 
            const data = await api(`admin/events/${event.id}`, { method: 'DELETE' });
            renderEvents(data.events || []);
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
    const info = document.createElement('div');
    info.className = 'event-info';
    const title = document.createElement('strong');
    title.textContent = update.title;
    const mediaType = document.createElement('span');
    mediaType.className = 'event-category';
    mediaType.textContent = update.mediaType;
    info.append(title, mediaType);
    item.append(info);
    const remove = document.createElement('button');
    remove.type = 'button'; 
    remove.className = 'delete-btn';
    remove.innerHTML = '🗑';
    remove.title = 'Delete media update';
    remove.addEventListener('click', async () => {
      if (!confirm(`Delete "${update.title}"?`)) return;
      try { 
        const data = await api(`admin/media-updates/${update.id}`, { method: 'DELETE' }); 
        renderMediaUpdates(data.mediaUpdates || []);
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
    
    // Keep uploads below Vercel's serverless request-body limit.
    if (file.size > 4 * 1024 * 1024) {
      showToast('File too large. Maximum 4 MB.', 'error');
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

// Sync status polling with detailed error reporting
function startSyncPolling() {
  let consecutiveFailures = 0;
  const retryBtn = document.getElementById('sync-retry');
  
  async function checkSync() {
    try {
      const res = await fetch('/api/content', { method: 'HEAD', cache: 'no-store' });
      if (res.ok) {
        setSyncStatus('synced');
        consecutiveFailures = 0;
        if (retryBtn) retryBtn.style.display = 'none';
      } else {
        let errorDetail = `HTTP ${res.status}`;
        try {
          const errorData = await res.json();
          if (errorData.error) errorDetail += `: ${errorData.error}`;
        } catch {}
        consecutiveFailures++;
        setSyncStatus('error', `Sync check failed: ${errorDetail} (failure ${consecutiveFailures}/3)`);
        if (retryBtn) retryBtn.style.display = 'inline-flex';
        
        if (consecutiveFailures >= 3) {
          showToast(`Sync failing: ${errorDetail}. Check Vercel deployment & env vars.`, 'error', 8000);
        }
      }
    } catch (err) {
      consecutiveFailures++;
      const errorMsg = err.message || 'Network error';
      setSyncStatus('error', `Network error: ${errorMsg} (failure ${consecutiveFailures}/3)`);
      if (retryBtn) retryBtn.style.display = 'inline-flex';
      if (consecutiveFailures >= 3) {
        showToast(`Sync network error: ${errorMsg}. Check Vercel deployment & network.`, 'error', 8000);
      }
    }
  }
  
  // Manual retry handler
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      retryBtn.style.display = 'none';
      checkSync();
    });
  }
  
  // Initial check
  checkSync();
  
  // Poll every 10 seconds
  setInterval(checkSync, 10000);
}

// Main initialization
async function loadDashboard() {
  try {
    setSyncStatus('syncing');
    const data = await api('admin/content');
    dashboard.hidden = false;
    loginForm.hidden = true;
    signoutButton.hidden = false;
    showDashboardFor(null);
    
    if (data.latestMessage) {
      document.getElementById('message-title').value = data.latestMessage.title;
      document.getElementById('message-body').value = data.latestMessage.body;
    }
    renderEvents(data.events || []);
    renderMediaUpdates(data.mediaUpdates || []);
    
    if (!dashboardInitialized) {
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
      document.querySelectorAll('#dashboard form').forEach(initFormLoading);

      startSyncPolling();
      dashboardInitialized = true;
    }
    
    setSyncStatus('synced');
    showToast('Dashboard loaded', 'success');
  } catch (error) {
    if (error.status === 401) {
      showLogin(error.message);
    } else {
      loginForm.hidden = false;
      loginMessage.textContent = error.message;
      setSyncStatus('error', error.message);
      showToast(error.message, 'error');
    }
  }
}

modeToggle.addEventListener('click', () => {
  authMode = authMode === 'login' ? 'register' : 'login';
  loginMessage.textContent = '';
  applyAuthMode();
  if (usernameInput) usernameInput.focus();
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = (usernameInput?.value ?? '').trim();
  const password = passwordInput?.value ?? '';
  if (!username || !password) return;

  const registering = authMode === 'register';
  if (submitButton) submitButton.disabled = true;
  loginMessage.textContent = registering ? 'Creating your account…' : 'Signing you in…';

  try {
    const result = await api('admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: registering ? 'register' : 'login', username, password }),
    });
    if (passwordInput) passwordInput.value = '';
    showToast(registering ? `Welcome, ${result.user.username}` : `Signed in as ${result.user.username}`, 'success');
    await loadDashboard();
    showDashboardFor(result.user);
  } catch (error) {
    if (error.status === 401) loginMessage.textContent = error.message;
    else if (error.status === 409) loginMessage.textContent = error.message;
    else loginMessage.textContent = error.message;
    showToast(error.message, 'error');
    setSyncStatus('error', error.message);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

signoutButton.addEventListener('click', async () => {
  try {
    await api('admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
  } catch {
    // Signing out locally is still correct even if the request fails.
  }
  showLogin('You have been signed out.');
  showToast('Signed out', 'success');
});

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
    renderEvents(data.events || []);
    renderMediaUpdates(data.mediaUpdates || []);
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
    renderMediaUpdates(data.mediaUpdates || []);
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
    renderEvents(data.events || []);
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
applyAuthMode();
loadDashboard().catch((error) => {
  showLogin(error.message);
});