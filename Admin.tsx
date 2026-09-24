/* ==========================================================================
   GNAAS CCTU CHAPTER — ADMIN PORTAL
   Deliberately simple: three panels for the three things the chapter
   publishes, plus a small status badge. Everything else is automatic.
   ========================================================================== */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import adminCss from '../styles/admin.css?raw';
import FileDropZone from '../admin/FileDropZone';
import { AutoTextarea, CharCounter, SubmitButton } from '../admin/fields';
import { ToastContainer, useToasts } from '../admin/toast';
import {
  adminAddEvent,
  adminAddMediaUpdate,
  adminDeleteEvent,
  adminDeleteMediaUpdate,
  adminLoadContent,
  adminSaveMessage,
  adminUploadMedia,
  getModeInfo,
  type ChapterContent,
  type ChapterEvent,
  type ContentMode,
  type MediaUpdate,
} from '../lib/content';
import { eventDateLabel } from '../lib/eventDate';

const SITE_TITLE = 'GNAAS CCTU Chapter | Ghana National Association of Adventist Students';
const ADMIN_TITLE = 'GNAAS CCTU | Admin';

type FormId = 'message-form' | 'media-update-form' | 'event-form';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/* ---------- Draft auto-save (same storage keys as the original admin.js) ---------- */
function readDraft(formId: FormId): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(`draft_${formId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveDraft(formId: FormId, data: Record<string, string>) {
  try {
    localStorage.setItem(`draft_${formId}`, JSON.stringify(data));
  } catch {
    /* storage full or blocked */
  }
}
function clearDraft(formId: FormId) {
  try {
    localStorage.removeItem(`draft_${formId}`);
  } catch {
    /* ignore */
  }
}

export default function Admin() {
  const { toasts, showToast, dismissToast, removeToast } = useToasts();
  const [mode, setMode] = useState<ContentMode | null>(null);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const startedRef = useRef(false);

  const [events, setEvents] = useState<ChapterEvent[]>([]);
  const [mediaUpdates, setMediaUpdates] = useState<MediaUpdate[]>([]);
  const [loadingForm, setLoadingForm] = useState<FormId | null>(null);

  // Latest message form
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const messageFileRef = useRef<HTMLInputElement>(null);

  // Media update form
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaBody, setMediaBody] = useState('');
  const mediaFileRef = useRef<HTMLInputElement>(null);
  const [mediaReset, setMediaReset] = useState(0);

  // Calendar event form
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState('worship');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');

  /* The original admin page never loaded the theme script, so it is always light. */
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousTheme = root.getAttribute('data-theme');
    root.removeAttribute('data-theme');
    document.title = ADMIN_TITLE;
    return () => {
      if (previousTheme) root.setAttribute('data-theme', previousTheme);
      document.title = SITE_TITLE;
    };
  }, []);

  const applyContent = useCallback((data: ChapterContent) => {
    setEvents(data.events);
    setMediaUpdates(data.mediaUpdates);
  }, []);

  /** Keeps the little status badge honest after every save. */
  const refreshMode = useCallback(() => setMode(getModeInfo().mode), []);

  const restoreDrafts = useCallback(() => {
    const forms: [FormId, Record<string, (value: string) => void>][] = [
      ['message-form', { 'message-title': setMessageTitle, 'message-body': setMessageBody }],
      ['media-update-form', { 'media-update-title': setMediaTitle, 'media-update-body': setMediaBody }],
      ['event-form', { 'event-title': setEventTitle, 'event-description': setEventDescription }],
    ];
    forms.forEach(([formId, setters]) => {
      const draft = readDraft(formId);
      if (!draft) return;
      Object.entries(setters).forEach(([fieldId, set]) => {
        if (draft[fieldId]) set(draft[fieldId]);
      });
    });
  }, []);

  /* ---------- Load the current content once ---------- */
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const { data, info } = await adminLoadContent();
        applyContent(data);
        setMode(info.mode);

        if (!readyRef.current) {
          readyRef.current = true;
          if (data.latestMessage) {
            setMessageTitle(data.latestMessage.title);
            setMessageBody(data.latestMessage.body);
          }
          restoreDrafts();
          setReady(true);
        }
      } catch (error) {
        showToast(errorMessage(error), 'error');
      }
    })();
  }, [applyContent, restoreDrafts, showToast]);

  /* ---------- Clear draft on Ctrl/Cmd + S ---------- */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      const activeForm = document.querySelector('form:focus-within') || document.querySelector('form');
      const submitBtn = activeForm?.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (submitBtn && !submitBtn.disabled) submitBtn.click();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  /* ---------- Draft-aware field handlers ---------- */
  const draftValues: Record<FormId, Record<string, string>> = {
    'message-form': { 'message-title': messageTitle, 'message-body': messageBody },
    'media-update-form': { 'media-update-title': mediaTitle, 'media-update-body': mediaBody },
    'event-form': { 'event-title': eventTitle, 'event-description': eventDescription },
  };

  const field =
    (formId: FormId, fieldId: string, setter: (value: string) => void) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setter(value);
      if (ready) saveDraft(formId, { ...draftValues[formId], [fieldId]: value });
    };

  /* ---------- Saving ---------- */
  const submitWith = async (formId: FormId, task: () => Promise<void>) => {
    if (ready) clearDraft(formId);
    setLoadingForm(formId);
    try {
      await task();
      refreshMode();
    } catch (error) {
      showToast(errorMessage(error), 'error');
    } finally {
      setLoadingForm(null);
    }
  };

  const handleMessageSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitWith('message-form', async () => {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      const file = messageFileRef.current?.files?.[0];
      if (file) {
        const uploaded = await adminUploadMedia(file);
        mediaUrl = uploaded.url;
        mediaType = uploaded.type;
      }
      applyContent(await adminSaveMessage({ title: messageTitle, body: messageBody, mediaUrl, mediaType }));
      showToast('Message saved', 'success');
    });
  };

  const handleMediaSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitWith('media-update-form', async () => {
      const file = mediaFileRef.current?.files?.[0];
      if (!file) throw new Error('Choose an image or video first.');
      const uploaded = await adminUploadMedia(file);
      const data = await adminAddMediaUpdate({
        title: mediaTitle,
        body: mediaBody,
        mediaUrl: uploaded.url,
        mediaType: uploaded.type,
      });
      setMediaUpdates(data.mediaUpdates);
      setMediaTitle('');
      setMediaBody('');
      if (mediaFileRef.current) mediaFileRef.current.value = '';
      setMediaReset((count) => count + 1);
      showToast('Media update published', 'success');
    });
  };

  const handleEventSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitWith('event-form', async () => {
      const data = await adminAddEvent({
        title: eventTitle,
        description: eventDescription,
        eventDate,
        category: eventCategory,
      });
      setEvents(data.events);
      setEventTitle('');
      setEventDescription('');
      setEventDate('');
      setEventCategory('worship');
      showToast('Event added', 'success');
    });
  };

  const handleDeleteEvent = async (item: ChapterEvent) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      const data = await adminDeleteEvent(item.id);
      setEvents(data.events);
      refreshMode();
      showToast('Event deleted', 'success');
    } catch (error) {
      showToast(errorMessage(error), 'error');
    }
  };

  const handleDeleteMedia = async (item: MediaUpdate) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      const data = await adminDeleteMediaUpdate(item.id);
      setMediaUpdates(data.mediaUpdates);
      refreshMode();
      showToast('Media update deleted', 'success');
    } catch (error) {
      showToast(errorMessage(error), 'error');
    }
  };

  const formClass = (formId: FormId) => `admin-form${loadingForm === formId ? ' loading' : ''}`;
  const live = mode === 'api';

  return (
    <>
      {/* admin.css is only active while the admin portal is shown */}
      <style id="admin-style">{adminCss}</style>

      <main className="admin-shell">
        <header className="admin-header">
          <a href="#home" className="back-link">← Public site</a>
          <h1>Chapter admin</h1>
          <div
            className="sync-indicator"
            data-status={live ? 'synced' : 'syncing'}
            title={live ? 'Connected — updates are published for everyone' : 'Saved in this browser'}
          >
            <span className="sync-dot"></span>
            <span>{live ? 'Live' : 'Saved in this browser'}</span>
          </div>
        </header>

        {!ready && <p className="panel-hint" role="status">Loading chapter content…</p>}

        <section id="dashboard" className="admin-panel" hidden={!ready}>
          {/* ---------- Latest message ---------- */}
          <header className="panel-header">
            <h2>Latest message</h2>
            <span className="panel-hint">Shown in the Latest Message area on the home page</span>
          </header>
          <form id="message-form" className={formClass('message-form')} onSubmit={handleMessageSubmit}>
            <div className="form-group">
              <label htmlFor="message-title">Title <span className="required">*</span></label>
              <input
                id="message-title"
                type="text"
                required
                maxLength={180}
                placeholder="Enter message title…"
                value={messageTitle}
                onChange={field('message-form', 'message-title', setMessageTitle)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="message-body">Body <span className="required">*</span></label>
              <AutoTextarea
                id="message-body"
                required
                maxLength={5000}
                rows={6}
                placeholder="Write your message…"
                autoExpand={ready}
                value={messageBody}
                onChange={field('message-form', 'message-body', setMessageBody)}
              />
              {ready && <CharCounter length={messageBody.length} max={5000} />}
            </div>
            <FileDropZone id="message-file" label="Media (image or video)" inputRef={messageFileRef} onToast={showToast} />
            <SubmitButton loading={loadingForm === 'message-form'}>Save &amp; Publish</SubmitButton>
          </form>

          {/* ---------- Media update ---------- */}
          <header className="panel-header">
            <h2>Media update</h2>
            <span className="panel-hint">Shown in the Media/Reels row on the home page</span>
          </header>
          <form id="media-update-form" className={formClass('media-update-form')} onSubmit={handleMediaSubmit}>
            <div className="form-group">
              <label htmlFor="media-update-title">Title <span className="required">*</span></label>
              <input
                id="media-update-title"
                type="text"
                required
                maxLength={180}
                placeholder="Media update title…"
                value={mediaTitle}
                onChange={field('media-update-form', 'media-update-title', setMediaTitle)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="media-update-body">Description</label>
              <AutoTextarea
                id="media-update-body"
                maxLength={2000}
                rows={4}
                placeholder="Optional description…"
                autoExpand={ready}
                value={mediaBody}
                onChange={field('media-update-form', 'media-update-body', setMediaBody)}
              />
              {ready && <CharCounter length={mediaBody.length} max={2000} />}
            </div>
            <FileDropZone
              id="media-update-file"
              label={<>Image or video <span className="required">*</span></>}
              required
              inputRef={mediaFileRef}
              onToast={showToast}
              resetSignal={mediaReset}
            />
            <SubmitButton loading={loadingForm === 'media-update-form'}>Publish media update</SubmitButton>
          </form>
          <div id="admin-media-updates" className="admin-list">
            {mediaUpdates.map((update) => (
              <article className="admin-event" key={update.id}>
                <div className="event-info">
                  <strong>{update.title}</strong>
                  <span className="event-category">{update.mediaType}</span>
                </div>
                <button type="button" className="delete-btn" title="Delete media update" onClick={() => handleDeleteMedia(update)}>
                  🗑
                </button>
              </article>
            ))}
          </div>

          {/* ---------- Calendar event ---------- */}
          <header className="panel-header">
            <h2>Calendar event</h2>
            <span className="panel-hint">Shown in the Events calendar on the home page</span>
          </header>
          <form id="event-form" className={formClass('event-form')} onSubmit={handleEventSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="event-title">Title <span className="required">*</span></label>
                <input
                  id="event-title"
                  type="text"
                  required
                  maxLength={180}
                  placeholder="Event title…"
                  value={eventTitle}
                  onChange={field('event-form', 'event-title', setEventTitle)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="event-category">Category <span className="required">*</span></label>
                <select id="event-category" required value={eventCategory} onChange={(e) => setEventCategory(e.target.value)}>
                  <option value="worship">Worship</option>
                  <option value="social">Social</option>
                  <option value="outreach">Outreach</option>
                  <option value="sports">Sports</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="event-description">Description</label>
              <AutoTextarea
                id="event-description"
                maxLength={1000}
                rows={3}
                placeholder="Event details…"
                autoExpand={ready}
                value={eventDescription}
                onChange={field('event-form', 'event-description', setEventDescription)}
              />
              {ready && <CharCounter length={eventDescription.length} max={1000} />}
            </div>
            <div className="form-group">
              <label htmlFor="event-date">Date &amp; time <span className="required">*</span></label>
              <input id="event-date" type="datetime-local" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <SubmitButton loading={loadingForm === 'event-form'}>Add event</SubmitButton>
          </form>
          <div id="admin-events" className="admin-list">
            {events.map((item) => (
              <article className="admin-event" key={item.id}>
                <div className="event-info">
                  <time>{eventDateLabel(item.eventDate)}</time>
                  <strong>{item.title}</strong>
                  <span className="event-category">{item.category}</span>
                </div>
                <button type="button" className="delete-btn" title="Delete event" onClick={() => handleDeleteEvent(item)}>
                  🗑
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} onRemove={removeToast} />
    </>
  );
}
