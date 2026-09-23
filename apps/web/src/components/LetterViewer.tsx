import { useEffect, useState } from 'react';
import styles from './LetterViewer.module.css';
import { SLText } from './SLText';
import { ReplyComposer } from './ReplyComposer';

import { unsealContentIfE2EE } from '../lib/e2ee';

export interface LetterAsset {
  assetId: string;
  kind: 'image' | 'video' | 'audio';
  variant: string;
  alt?: string;
}

export interface LetterData {
  id: string;
  title: string;
  body: string;
  assets?: LetterAsset[];
}

export interface LetterViewerProps {
  letterId: string;
  onClose: () => void;
}

export function LetterViewer({ letterId, onClose }: LetterViewerProps) {
  const [letter, setLetter] = useState<LetterData | null>(null);
  const [bodyText, setBodyText] = useState('');
  const [isE2EE, setIsE2EE] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // In a real implementation this would fetch from /letters/:id API using the API client
    // For now we mock it
    setLoading(false);
    setLetter({
      id: letterId,
      title: 'A sealed message',
      body: 'This is a mock letter body.\n\n*With some italic text.*'
    });
  }, [letterId]);

  useEffect(() => {
    if (!letter?.body) return;
    let active = true;
    void unsealContentIfE2EE(letter.body, {
      table: 'letters',
      column: 'body_sealed',
      rowId: letter.id,
    }).then(({ unsealed, isE2EE: e2eeActive }) => {
      if (active) {
        setBodyText(unsealed);
        setIsE2EE(e2eeActive);
      }
    });
    return () => {
      active = false;
    };
  }, [letter?.body, letter?.id]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.paper} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close Letter">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {loading && <div className={styles.loading}>Unfolding...</div>}
        {error && <div className={styles.error}>{error}</div>}
        
        {letter && (
          <div className={styles.content}>
            <h1 className={styles.title}>{letter.title}</h1>
            {isE2EE && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-green-400, #7dbe9c)', margin: '4px 0 12px 0' }}>
                <span>✦</span>
                <span>Hardware E2EE Sealed</span>
              </div>
            )}
            <div className={styles.body}>
              <SLText content={bodyText || letter.body} />
            </div>
            <ReplyComposer targetType="letter" targetId={letter.id} />
          </div>
        )}
      </div>
    </div>
  );
}
