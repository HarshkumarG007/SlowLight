import { useState, useEffect } from 'react';
import styles from './MemoryPanel.module.css';
import { SLText } from './SLText';
import { ReplyComposer } from './ReplyComposer';
import { unsealContentIfE2EE } from '../lib/e2ee';

export interface MemoryAsset {
  assetId: string;
  kind: 'image' | 'video' | 'audio';
  variant: string;
  alt?: string;
  ordering: number;
}

export interface MemoryData {
  id: string;
  title: string;
  subtitle?: string;
  occurredOn: string;
  datePrecision: string;
  story: string;
  chapter?: { id: string, title: string } | null;
  location?: { labelSealed: string } | null;
  assets?: MemoryAsset[];
}

export interface MemoryPanelProps {
  memory: MemoryData;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export function MemoryPanel({ memory, onClose, onNext, onPrev, hasNext, hasPrev }: MemoryPanelProps) {
  const [storyText, setStoryText] = useState(memory.story);
  const [isE2EE, setIsE2EE] = useState(false);

  useEffect(() => {
    let active = true;
    void unsealContentIfE2EE(memory.story, {
      table: 'memories',
      column: 'story_sealed',
      rowId: memory.id,
    }).then(({ unsealed, isE2EE: e2eeActive }) => {
      if (active) {
        setStoryText(unsealed);
        setIsE2EE(e2eeActive);
      }
    });
    return () => {
      active = false;
    };
  }, [memory.story, memory.id]);

  // Simple format for the date based on precision (mocked here, should use a formatter)
  const displayDate = new Date(memory.occurredOn).toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: memory.datePrecision !== 'year' ? 'long' : undefined,
    day: memory.datePrecision === 'day' ? 'numeric' : undefined
  });

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <div className={styles.meta}>
            {memory.chapter && <span className={styles.chapter}>{memory.chapter.title}</span>}
            <span className={styles.date}>{displayDate}</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        
        <div className={styles.content}>
          <h1 className={styles.title}>{memory.title}</h1>
          {memory.subtitle && <h2 className={styles.subtitle}>{memory.subtitle}</h2>}
          {memory.location && <div className={styles.location}>{memory.location.labelSealed}</div>}
          
          {isE2EE && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-green-400, #7dbe9c)', margin: '4px 0 12px 0' }}>
              <span>✦</span>
              <span>Hardware E2EE Sealed</span>
            </div>
          )}

          <div className={styles.story}>
            <SLText content={storyText} />
          </div>
          
          {memory.assets && memory.assets.length > 0 && (
            <div className={styles.assetsGallery}>
              {/* Render DOM elements for photos/videos */}
              {memory.assets.map((_, i) => (
                <div key={i} className={styles.assetWrapper}>
                  {/* Mock rendering of asset */}
                  <div className={styles.assetPlaceholder}>Asset {i + 1}</div>
                </div>
              ))}
            </div>
          )}

          <ReplyComposer targetType="memory" targetId={memory.id} />
        </div>
        
        <footer className={styles.footer}>
          <button 
            className={styles.navBtn} 
            disabled={!hasPrev} 
            onClick={onPrev}
            aria-label="Previous Memory"
          >
            Previous
          </button>
          <button 
            className={styles.navBtn} 
            disabled={!hasNext} 
            onClick={onNext}
            aria-label="Next Memory"
          >
            Next
          </button>
        </footer>
      </div>
    </div>
  );
}
