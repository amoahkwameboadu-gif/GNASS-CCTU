import { useLayoutEffect, useRef, type ReactNode, type TextareaHTMLAttributes } from 'react';

/* ---------- Character counter ---------- */
export function CharCounter({ length, max }: { length: number; max: number }) {
  const className = `char-counter${length > max ? ' error' : length > max * 0.9 ? ' warning' : ''}`;
  return (
    <div className={className}>
      <span className="current">{length}</span> / {max}
    </div>
  );
}

/* ---------- Auto-expanding textarea (grows up to 300px) ---------- */
export function AutoTextarea({
  autoExpand,
  value,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { autoExpand: boolean; value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = ref.current;
    if (!textarea || !autoExpand) return;
    textarea.style.resize = 'none';
    textarea.style.overflow = 'hidden';
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
  }, [value, autoExpand]);

  return <textarea ref={ref} value={value} {...props} />;
}

/* ---------- Submit button with loading state ---------- */
export function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <button className="btn btn-primary" type="submit" disabled={loading}>
      {loading ? (
        <>
          <span className="spinner"></span> Saving…
        </>
      ) : (
        children
      )}
    </button>
  );
}
