import { useState, useEffect } from 'react';
import styles from './FutureEntries.module.css';
import { SLText } from './SLText';

export interface FutureEntry {
  id: string;
  kind: 'promise' | 'place' | 'plan' | 'dream' | 'blank';
  title: string;
  noteSealed?: string;
  status: 'draft' | 'unlit' | 'arrived' | 'archived';
  targetDate?: string;
  targetPrecision: string;
}

export interface FutureEntriesProps {
  onClose: () => void;
}

export function FutureEntries({ onClose }: FutureEntriesProps) {
  const [entries, setEntries] = useState<FutureEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real implementation this would fetch from /future API
    setLoading(false);
    setEntries([
      { id: '1', kind: 'promise', title: 'Visit the Northern Lights', status: 'unlit', targetPrecision: 'year' },
      { id: '2', kind: 'place', title: 'The little cafe in Rome', status: 'unlit', targetPrecision: 'year' }
    ]);
  }, []);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <h1 className={styles.title}>The Horizon</h1>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className={styles.content}>
          {loading && <div className={styles.status}>Looking forward...</div>}
          
          {!loading && entries.length === 0 && (
            <div className={styles.status}>No future entries yet.</div>
          )}

          {!loading && entries.length > 0 && (
            <div className={styles.timeline}>
              {entries.map(entry => (
                <div key={entry.id} className={styles.entry}>
                  <div className={styles.marker}></div>
                  <div className={styles.card}>
                    <div className={styles.meta}>
                      <span className={styles.kind}>{entry.kind}</span>
                    </div>
                    <h3 className={styles.entryTitle}>{entry.title}</h3>
                    {entry.noteSealed && (
                      <div className={styles.note}>
                        <SLText content={entry.noteSealed} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
