import styles from './MemoryPanel.module.css';
import { SLText } from './SLText';
import { ReplyComposer } from './ReplyComposer';

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
          
          <div className={styles.story}>
            <SLText content={memory.story} />
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
