import { useEffect, useState } from 'react';
import styles from './MediaViewer.module.css';
import { MediaAsset } from './MediaAsset';
import { SLText } from './SLText';

export interface MediaViewerItem {
  id: string;
  kind: 'image' | 'video' | 'audio';
  variant: string;
  lqip?: string;
  alt?: string;
  captionSealed?: string;
}

export interface MediaViewerProps {
  items: MediaViewerItem[];
  initialIndex?: number;
  onClose: () => void;
}

export function MediaViewer({ items, initialIndex = 0, onClose }: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, items.length]);

  const handleNext = () => {
    if (currentIndex < items.length - 1) setCurrentIndex(c => c + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(c => c - 1);
  };

  if (items.length === 0) return null;

  const currentItem = items[currentIndex]!;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Media Viewer">
      {/* Background blur */}
      <div className={styles.backdrop} />

      <button className={styles.closeBtn} onClick={onClose} aria-label="Close viewer">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className={styles.viewerContainer} onClick={e => e.stopPropagation()}>
        {/* Navigation Left */}
        <button 
          className={`${styles.navBtn} ${styles.navLeft}`} 
          onClick={handlePrev}
          disabled={currentIndex === 0}
          aria-label="Previous media"
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className={styles.mediaStage}>
          {/* Use a key based on item ID so MediaAsset re-mounts/re-fetches for each new item */}
          <MediaAsset 
            key={currentItem.id}
            assetId={currentItem.id} 
            kind={currentItem.kind} 
            variant={currentItem.variant}
            lqip={currentItem.lqip}
            alt={currentItem.alt}
          />
        </div>

        {/* Navigation Right */}
        <button 
          className={`${styles.navBtn} ${styles.navRight}`} 
          onClick={handleNext}
          disabled={currentIndex === items.length - 1}
          aria-label="Next media"
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {currentItem.captionSealed && (
        <div className={styles.captionContainer} onClick={e => e.stopPropagation()}>
          <SLText content={currentItem.captionSealed} className={styles.captionText} />
        </div>
      )}

      {items.length > 1 && (
        <div className={styles.indicators}>
          {items.map((_, i) => (
            <div 
              key={i} 
              className={`${styles.indicator} ${i === currentIndex ? styles.indicatorActive : ''}`} 
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
