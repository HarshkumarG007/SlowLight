import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react';
import styles from './ReplyComposer.module.css';

export interface ReplyComposerProps {
  targetType: 'memory' | 'letter';
  targetId: string;
  onSent?: () => void;
}

export function ReplyComposer({ targetType, targetId, onSent }: ReplyComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          content: trimmed,
        }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error ?? 'Failed to send reply');
      }

      setSuccess(true);
      setContent('');
      if (onSent) onSent();

      // Reset success status after a few seconds
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
      }, 3500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    setError(null);
    if (!isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.successMsg} role="status">
          ✦ Sealed and held in the quiet.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {!isOpen ? (
        <button
          className={styles.toggleBtn}
          onClick={toggleOpen}
          aria-expanded={isOpen}
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
            />
          </svg>
          Leave a whisper...
        </button>
      ) : (
        <form onSubmit={handleSubmit} className={styles.composer}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a reflection or whisper back..."
            maxLength={5000}
            disabled={submitting}
            aria-label="Your reflection"
          />

          {error && (
            <div className={styles.errorMsg} role="alert">
              {error}
            </div>
          )}

          <div className={styles.actions}>
            <span className={styles.charCount}>
              {content.length} / 5000
            </span>

            <div className={styles.buttons}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={toggleOpen}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={!content.trim() || submitting}
              >
                {submitting ? 'Sealing...' : 'Seal & Send'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
