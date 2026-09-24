/* ==========================================================================
   Backend connection settings.

   Where the site looks for the chapter API, and the optional admin password.
   Both live in localStorage, so the admin portal can point at a backend
   without a rebuild (e.g. while testing a deploy, or a self-hosted API).

   Default is "/api" — the same origin. That is what works on a Vercel
   deployment (see /api functions) and with the bundled Node server, which
   serves the site and the API together.
   ========================================================================== */

export const DEFAULT_API_BASE = '/api';

const BASE_KEY = 'gnaas-api-base';
const TOKEN_KEY = 'gnaas-api-token';
const CHANNEL_NAME = 'gnaas-cctu-api-config';

const read = (key: string): string => {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
};

const write = (key: string, value: string) => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* storage blocked — the value simply is not remembered */
  }
};

/**
 * Turns whatever the user types into a usable API base.
 *   ""                        → "/api"
 *   "/api"                    → "/api"
 *   "api"                     → "/api"
 *   "https://host"            → "https://host/api"
 *   "https://host/api/"       → "https://host/api"
 */
export function normalizeApiBase(input: string): string {
  const raw = (input || '').trim();
  if (!raw) return DEFAULT_API_BASE;

  let value = raw.replace(/\/+$/, '');

  if (!/^https?:\/\//i.test(value)) {
    if (value.startsWith('/')) {
      /* already relative */
    } else if (value.includes('.') || value.includes(':')) {
      value = `https://${value}`;
    } else {
      value = `/${value}`;
    }
  }

  if (!/\/api$/i.test(value)) value = `${value}/api`;
  return value;
}

export function getApiBase(): string {
  const stored = read(BASE_KEY);
  return stored ? normalizeApiBase(stored) : DEFAULT_API_BASE;
}

export function getApiToken(): string {
  return read(TOKEN_KEY);
}

export const apiUrl = (path: string) => `${getApiBase().replace(/\/+$/, '')}/${path.replace(/^\//, '')}`;

/* ---------- change notifications (same tab, other tabs, config panel) ---------- */
const listeners = new Set<() => void>();
let listening = false;

function notify() {
  listeners.forEach((listener) => listener());
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage('config-changed');
      channel.close();
    } catch {
      /* ignore */
    }
  }
}

function ensureListeners() {
  if (listening) return;
  listening = true;
  try {
    // Another tab changed the setting
    window.addEventListener('storage', (event) => {
      if (event.key === BASE_KEY || event.key === TOKEN_KEY) notify();
    });
  } catch {
    /* ignore */
  }
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = () => listeners.forEach((listener) => listener());
    } catch {
      /* ignore */
    }
  }
}

export function subscribeToApiConfigChanges(callback: () => void): () => void {
  ensureListeners();
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function setApiBase(input: string): string {
  const value = normalizeApiBase(input);
  write(BASE_KEY, value === DEFAULT_API_BASE ? '' : value);
  notify();
  return value;
}

export function setApiToken(token: string): void {
  write(TOKEN_KEY, token.trim());
  notify();
}

export const isDefaultApiBase = () => getApiBase() === DEFAULT_API_BASE;
