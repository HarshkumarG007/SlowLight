import { useEffect, useState } from 'react';
import styles from './AdminComponents.module.css';

export interface ReplyItem {
  id: string;
  targetType: 'memory' | 'letter';
  targetId: string;
  content: string;
  createdAt: string;
}

export function RepliesViewer() {
  const [replies, setReplies] = useState<ReplyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReplies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/replies');
      if (!res.ok) throw new Error('Failed to load replies');
      const json = (await res.json()) as { success: boolean; data: ReplyItem[] };
      setReplies(json.data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching replies';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReplies();
  }, []);

  return (
    <div className={styles.panel}>
      <h2>Recipient Replies & Reflections</h2>

      <div className={styles.section}>
        <p>
          Private notes and reflections sealed and sent by the Recipient. In accordance with UX-10, no read receipts are returned to the Recipient.
        </p>
        <button
          className={styles.secondaryBtn}
          onClick={() => void fetchReplies()}
          disabled={loading}
          type="button"
        >
          {loading ? 'Refreshing...' : 'Refresh Replies'}
        </button>
      </div>

      {error && <p style={{ color: 'var(--color-red-400, #e5786d)' }}>{error}</p>}

      <div className={styles.section}>
        {replies.length === 0 && !loading && !error ? (
          <p style={{ fontStyle: 'italic', color: 'var(--color-ink-400)' }}>
            No replies received yet. Whispers left by the Recipient will appear here.
          </p>
        ) : (
          <table className={styles.auditTable}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Target</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {replies.map((reply) => (
                <tr key={reply.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(reply.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                      {reply.targetType}
                    </span>
                    <br />
                    <small style={{ color: 'var(--color-ink-400)' }}>
                      {reply.targetId.slice(0, 8)}...
                    </small>
                  </td>
                  <td style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {reply.content}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
