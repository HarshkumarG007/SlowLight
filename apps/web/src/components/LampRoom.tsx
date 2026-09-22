import { useEffect, useState } from 'react';
import styles from './LampRoom.module.css';

export interface LetterSummary {
  id: string;
  title: string;
  unlockMode: 'open' | 'timed' | 'held';
  unlockAt?: string | null;
  sealCeremony: boolean;
  openedAt?: string | null;
}

export interface LampRoomProps {
  onClose: () => void;
  onOpenLetter: (id: string) => void;
}

export function LampRoom({ onClose, onOpenLetter }: LampRoomProps) {
  const [letters, setLetters] = useState<LetterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // In a real implementation this would fetch from /letters API using the API client
    // For now we mock it as the backend is just created.
    setLoading(false);
    setLetters([]);
  }, []);

  const isUnlocked = (l: LetterSummary) => {
    if (l.unlockMode === 'open') return true;
    if (l.unlockMode === 'timed' && l.unlockAt && new Date(l.unlockAt) <= new Date()) return true;
    return false;
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <h1 className={styles.title}>The Lamp Room</h1>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        
        <div className={styles.content}>
          {loading && <div className={styles.stateMessage}>Lighting the lamps...</div>}
          {error && <div className={styles.errorMessage}>{error}</div>}
          
          {!loading && !error && letters.length === 0 && (
            <div className={styles.stateMessage}>No letters have been placed here yet.</div>
          )}

          {!loading && !error && letters.length > 0 && (
            <ul className={styles.letterList}>
              {letters.map(letter => {
                const unlocked = isUnlocked(letter);
                return (
                  <li 
                    key={letter.id} 
                    className={`${styles.letterItem} ${!unlocked ? styles.locked : ''}`}
                    onClick={() => unlocked && onOpenLetter(letter.id)}
                  >
                    <div className={styles.letterIcon}>
                      {unlocked ? (
                        letter.openedAt ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21H3M21 21v-4M3 21v-4M12 3v14M12 3l-4 4M12 3l4 4" />
                          </svg>
                        )
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth={1.5} />
                          <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
                        </svg>
                      )}
                    </div>
                    <div className={styles.letterDetails}>
                      <h3 className={styles.letterTitle}>{letter.title}</h3>
                      <div className={styles.letterStatus}>
                        {unlocked 
                          ? (letter.openedAt ? `Opened ${new Date(letter.openedAt).toLocaleDateString()}` : 'Ready to open') 
                          : `Unlocks ${letter.unlockAt ? new Date(letter.unlockAt).toLocaleDateString() : 'later'}`
                        }
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
