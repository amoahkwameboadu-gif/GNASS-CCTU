import { useEffect, useState, type DragEvent, type ReactNode, type RefObject } from 'react';
import type { ToastType } from './toast';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const previewStyle = { maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' };

/* ---------- File upload with drag-and-drop and preview ---------- */
export default function FileDropZone({
  id,
  label,
  required = false,
  inputRef,
  onToast,
  resetSignal = 0,
}: {
  id: string;
  label: ReactNode;
  required?: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onToast: (message: string, type?: ToastType) => void;
  resetSignal?: number;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<{ url: string; isVideo: boolean } | null>(null);

  // Parent bumps resetSignal after a successful publish to clear the preview
  useEffect(() => {
    if (resetSignal) setPreview(null);
  }, [resetSignal]);

  // Release object URLs we no longer show
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const handleFile = () => {
    const input = inputRef.current;
    const file = input?.files?.[0];
    if (!input || !file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      onToast('Unsupported file type. Use JPEG, PNG, WebP, GIF, MP4, WebM, or MOV.', 'error');
      input.value = '';
      return;
    }

    // Check size (25MB)
    if (file.size > MAX_BYTES) {
      onToast('File too large. Maximum 25 MB.', 'error');
      input.value = '';
      return;
    }

    // Show preview
    setPreview({ url: URL.createObjectURL(file), isVideo: file.type.startsWith('video/') });
    onToast(`${file.name} ready to upload`, 'success');
  };

  const stop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className={`form-group file-drop-zone${dragOver ? ' drag-over' : ''}`}
      onDragEnter={(event) => { stop(event); setDragOver(true); }}
      onDragOver={(event) => { stop(event); setDragOver(true); }}
      onDragLeave={(event) => { stop(event); setDragOver(false); }}
      onDrop={(event) => {
        stop(event);
        setDragOver(false);
        const files = event.dataTransfer.files;
        if (files[0] && inputRef.current) {
          inputRef.current.files = files;
          handleFile();
        }
      }}
    >
      <label htmlFor={id}>{label}</label>
      <input id={id} ref={inputRef} type="file" accept="image/*,video/*" required={required} onChange={handleFile} />
      <div id={`${id}-preview`} className="file-preview" style={{ display: preview ? 'block' : 'none' }}>
        {preview &&
          (preview.isVideo ? (
            <video src={preview.url} controls style={previewStyle} />
          ) : (
            <img src={preview.url} alt="Selected file preview" style={previewStyle} />
          ))}
      </div>
      <p className="field-hint">Drag &amp; drop or click to select. Max 25 MB. JPEG, PNG, WebP, GIF, MP4, WebM, MOV.</p>
    </div>
  );
}
