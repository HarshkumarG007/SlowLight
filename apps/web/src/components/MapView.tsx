import { useState, useRef, useEffect, useCallback, type MouseEvent, type WheelEvent, type TouchEvent } from 'react';
import styles from './MapView.module.css';
import { projectEquirectangular, calculateJourneyPath, type MapMemoryPin } from '@slow-light/shared';

export interface MapViewProps {
  pins: MapMemoryPin[];
  journeyPath?: string;
  focusedMemoryId?: string;
  onSelectMemory?: (memoryId: string) => void;
  onClose: () => void;
}

// Simplified continent vector paths in equirectangular projection (viewBox 0 0 1000 500)
const WORLD_LANDMASS_PATHS = [
  // North America & Greenland
  "M 45,70 Q 75,55 125,50 T 210,60 T 260,85 T 285,115 T 310,140 T 290,170 T 270,185 T 245,215 T 215,220 T 195,195 T 160,175 T 130,165 T 90,140 T 55,105 Z",
  // Greenland
  "M 350,30 Q 380,25 410,40 T 405,80 T 365,85 T 345,60 Z",
  // South America
  "M 270,225 Q 310,230 350,260 T 395,295 T 365,360 T 325,410 T 300,425 T 295,380 T 290,320 T 275,260 Z",
  // Europe
  "M 460,90 Q 510,70 560,95 T 590,135 T 550,155 T 500,160 T 470,145 T 450,120 Z",
  // United Kingdom & Ireland
  "M 450,100 Q 460,95 465,110 T 455,125 T 445,115 Z",
  // Africa & Madagascar
  "M 465,165 Q 525,160 575,185 T 620,235 T 580,310 T 545,365 T 515,355 T 485,300 T 465,240 T 440,200 Z",
  // Madagascar
  "M 625,310 Q 635,315 630,345 T 620,350 T 615,325 Z",
  // Asia
  "M 570,85 Q 670,60 780,75 T 880,105 T 930,145 T 870,185 T 800,205 T 740,245 T 690,265 T 660,205 T 610,170 T 580,130 Z",
  // Indian Subcontinent
  "M 675,195 Q 705,210 715,250 T 685,285 T 665,235 Z",
  // Japan
  "M 885,130 Q 905,145 895,175 T 880,165 Z",
  // Southeast Asia & Indonesia
  "M 740,240 Q 770,250 810,270 T 845,305 T 790,320 T 745,290 Z",
  // Australia & New Zealand
  "M 810,335 Q 865,320 905,345 T 910,400 T 850,420 T 800,390 T 795,355 Z",
  "M 935,405 Q 945,415 935,440 T 925,425 Z",
  // Antarctica
  "M 50,470 Q 250,460 500,465 T 750,460 T 950,470 L 980,500 L 20,500 Z"
];

export function MapView({
  pins,
  journeyPath: initialJourneyPath,
  focusedMemoryId,
  onSelectMemory,
  onClose,
}: MapViewProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showJourney, setShowJourney] = useState(true);
  const [selectedPin, setSelectedPin] = useState<MapMemoryPin | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Compute or use journey trail
  const journeyD = initialJourneyPath ?? calculateJourneyPath(pins);

  // Center on focused memory if requested
  useEffect(() => {
    if (!focusedMemoryId || pins.length === 0) return;
    const target = pins.find((p) => p.memoryId === focusedMemoryId);
    if (!target) return;

    setSelectedPin(target);
    const pt = projectEquirectangular({ lat: target.lat, lng: target.lng });
    const targetScale = 2.2;
    setZoom(targetScale);
    setPan({
      x: 500 - pt.x * targetScale,
      y: 250 - pt.y * targetScale,
    });
  }, [focusedMemoryId, pins]);

  // Keyboard navigation: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prev) => Math.max(1, Math.min(6, prev * factor)));
  }, []);

  // Drag pan handlers
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan handlers
  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDragging(true);
    setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    if (!touch) return;
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedPin(null);
  };

  const zoomIn = () => setZoom((z) => Math.min(6, z * 1.3));
  const zoomOut = () => setZoom((z) => Math.max(1, z / 1.3));

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Constellation Map">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <h2 className={styles.title}>
              <span className={styles.titleIcon}>✦</span>
              <span>Constellation of Places</span>
            </h2>
            <span className={styles.subtitle}>
              {pins.length} {pins.length === 1 ? 'place' : 'places'} remembered
            </span>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.btnControl} ${showJourney ? styles.btnControlActive : ''}`}
              onClick={() => setShowJourney((v) => !v)}
              title="Toggle Chronological Journey Trail"
            >
              <span>✦ Journey</span>
            </button>

            <button
              type="button"
              className={styles.btnControl}
              onClick={resetView}
              title="Reset View"
            >
              Reset
            </button>

            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close Map"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Viewport */}
        <div
          ref={containerRef}
          className={styles.mapViewport}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Zoom buttons overlay */}
          <div className={styles.zoomOverlay}>
            <button type="button" className={styles.zoomBtn} onClick={zoomIn} title="Zoom In">+</button>
            <button type="button" className={styles.zoomBtn} onClick={zoomOut} title="Zoom Out">−</button>
          </div>

          <svg
            className={styles.svgMap}
            viewBox="0 0 1000 500"
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Transform container for pan and zoom */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Ocean Canvas Background */}
              <rect x="0" y="0" width="1000" height="500" className={styles.oceanBg} />

              {/* Graticule Lines (Latitude & Longitude) */}
              <g className={styles.graticule}>
                <line x1="0" y1="83" x2="1000" y2="83" />   {/* 60° N */}
                <line x1="0" y1="167" x2="1000" y2="167" /> {/* 30° N */}
                <line x1="0" y1="333" x2="1000" y2="333" /> {/* 30° S */}
                <line x1="0" y1="417" x2="1000" y2="417" /> {/* 60° S */}
                <line x1="167" y1="0" x2="167" y2="500" /> {/* 120° W */}
                <line x1="333" y1="0" x2="333" y2="500" /> {/* 60° W */}
                <line x1="500" y1="0" x2="500" y2="500" /> {/* Prime Meridian */}
                <line x1="667" y1="0" x2="667" y2="500" /> {/* 60° E */}
                <line x1="833" y1="0" x2="833" y2="500" /> {/* 120° E */}
              </g>

              {/* Equator */}
              <line x1="0" y1="250" x2="1000" y2="250" className={styles.equator} />

              {/* Landmass Outlines */}
              {WORLD_LANDMASS_PATHS.map((d, index) => (
                <path key={index} d={d} className={styles.landmass} />
              ))}

              {/* Chronological Journey Constellation Trail */}
              {showJourney && journeyD && (
                <path d={journeyD} className={styles.journeyTrail} />
              )}

              {/* Memory Starlight Pins */}
              {pins.map((pin) => {
                const pt = projectEquirectangular({ lat: pin.lat, lng: pin.lng });
                const isSelected = selectedPin?.id === pin.id;

                return (
                  <g
                    key={pin.id}
                    className={`${styles.pinGroup} ${isSelected ? styles.pinGroupActive : ''}`}
                    transform={`translate(${pt.x}, ${pt.y})`}
                    onClick={() => setSelectedPin(pin)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${pin.label}: ${pin.title}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedPin(pin);
                      }
                    }}
                  >
                    {/* Glowing halo */}
                    <circle r="14" className={styles.pinHalo} />
                    {/* Core pin */}
                    <circle r="4.5" className={styles.pinCore} />
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Empty state notice */}
          {pins.length === 0 && (
            <div className={styles.emptyNotice}>
              No memories with geographic coordinates found yet.
            </div>
          )}

          {/* Floating Memory Preview Card */}
          {selectedPin && (
            <div className={styles.floatingCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardPlace}>{selectedPin.label}</span>
                <span className={styles.cardDate}>
                  {new Date(selectedPin.occurredOn).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <h3 className={styles.cardTitle}>{selectedPin.title}</h3>
              <div className={styles.cardFooter}>
                <span className={styles.cardEmotion}>
                  {selectedPin.emotion ? `✦ ${selectedPin.emotion}` : '✦ memory'}
                </span>
                {onSelectMemory && (
                  <button
                    type="button"
                    className={styles.cardOpenBtn}
                    onClick={() => {
                      onSelectMemory(selectedPin.memoryId);
                      onClose();
                    }}
                  >
                    Open Memory
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
