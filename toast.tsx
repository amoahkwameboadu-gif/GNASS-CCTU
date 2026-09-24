import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------- Toast notification system (from admin.js) ---------- */
export type ToastType = 'success' | 'error' | 'info';

type Toast = { id: number; message: string; type: ToastType; visible: boolean };

let toastId = 0;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, number>());

  const removeToast = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const dismissToast = useCallback(
    (id: number) => {
      const timer = timers.current.get(id);
      if (timer) window.clearTimeout(timer);
      timers.current.delete(id);
      setToasts((list) => list.map((toast) => (toast.id === id ? { ...toast, visible: false } : toast)));
      // Safety net in case transitionend never fires (e.g. background tab)
      window.setTimeout(() => removeToast(id), 600);
    },
    [removeToast],
  );

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 4000) => {
      const id = ++toastId;
      setToasts((list) => [...list, { id, message, type, visible: false }]);
      // Animate in on the next painted frame
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          setToasts((list) => list.map((toast) => (toast.id === id ? { ...toast, visible: true } : toast))),
        ),
      );
      // Auto dismiss
      timers.current.set(id, window.setTimeout(() => dismissToast(id), duration));
    },
    [dismissToast],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return { toasts, showToast, dismissToast, removeToast };
}

const ICONS: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' };

export function ToastContainer({
  toasts,
  onDismiss,
  onRemove,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div id="toast-container" className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}${toast.visible ? ' show' : ''}`}
          onTransitionEnd={() => {
            if (!toast.visible) onRemove(toast.id);
          }}
        >
          <span className="toast-icon">{ICONS[toast.type]}</span>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" aria-label="Dismiss" onClick={() => onDismiss(toast.id)}>
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
