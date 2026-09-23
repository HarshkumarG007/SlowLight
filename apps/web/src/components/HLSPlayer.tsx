import { useState, useEffect, useRef } from 'react';
import { useMediaAccess } from '../hooks/useMediaAccess';
import styles from './MediaViewer.module.css';

export interface HLSPlayerProps {
  assetId: string;
  initialVariant?: string;
  onError?: () => void;
  mediaRef?: React.RefObject<HTMLVideoElement>;
}

type QualityTier = 'auto' | '1080p' | '720p' | '480p' | '360p';

export function HLSPlayer({ assetId, initialVariant, onError, mediaRef: externalRef }: HLSPlayerProps) {
  const { getUrl, refreshUrl } = useMediaAccess();
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalRef || internalRef;

  const [selectedQuality, setSelectedQuality] = useState<QualityTier>('auto');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isNativeHLS, setIsNativeHLS] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Check native HLS support on mount
  useEffect(() => {
    const video = document.createElement('video');
    const canPlayHLS = video.canPlayType('application/vnd.apple.mpegurl') !== '';
    setIsNativeHLS(canPlayHLS);
  }, []);

  // Determine which variant to request
  const resolveTargetVariant = (quality: QualityTier): string => {
    if (initialVariant && initialVariant !== 'hls' && quality === 'auto' && !isNativeHLS) {
      return initialVariant;
    }
    if (quality === 'auto') {
      return isNativeHLS ? 'hls' : '720p';
    }
    return quality;
  };

  // Fetch or update video source
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const targetVariant = resolveTargetVariant(selectedQuality);

    getUrl(assetId, targetVariant)
      .then((url) => {
        if (!mounted) return;

        // Preserve current playback timestamp across switches
        const currentTime = videoRef.current?.currentTime || 0;
        const isPaused = videoRef.current?.paused ?? true;

        setVideoSrc(url);
        setLoading(false);

        if (currentTime > 0 && videoRef.current) {
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.currentTime = currentTime;
              if (!isPaused) {
                void videoRef.current.play().catch(() => {
                  // Autoplay policy fallback
                });
              }
            }
          }, 50);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
        onError?.();
      });

    return () => {
      mounted = false;
    };
  }, [assetId, selectedQuality, isNativeHLS, getUrl]);

  // Handle signed URL expiry / network error
  const handlePlaybackError = async () => {
    if (refreshing) return;
    setRefreshing(true);

    const targetVariant = resolveTargetVariant(selectedQuality);
    const currentTime = videoRef.current?.currentTime || 0;

    try {
      const newUrl = await refreshUrl(assetId, targetVariant);
      setVideoSrc(newUrl);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = currentTime;
          void videoRef.current.play().catch(() => {
            // Autoplay policy fallback
          });
        }
        setRefreshing(false);
      }, 50);
    } catch {
      setRefreshing(false);
      onError?.();
    }
  };

  const handleQualityChange = (newQuality: QualityTier) => {
    if (newQuality === selectedQuality) return;
    setSelectedQuality(newQuality);
  };

  const tiers: QualityTier[] = ['auto', '1080p', '720p', '480p', '360p'];

  return (
    <div className={styles.hlsContainer}>
      {videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          className={styles.video}
          controls
          playsInline
          preload="metadata"
          onError={() => void handlePlaybackError()}
        />
      )}

      {loading && <div className={styles.loading}>Connecting stream...</div>}

      <div className={styles.hlsBadgeBar}>
        <div className={styles.hlsStatusBadge}>
          <span>●</span>
          <span>
            {selectedQuality === 'auto' && isNativeHLS
              ? 'HLS Adaptive (Native Apple HLS)'
              : selectedQuality === 'auto'
              ? 'Adaptive Stream (Auto 720p)'
              : `Manual Stream (${selectedQuality})`}
          </span>
        </div>

        <div className={styles.hlsQualitySelector} role="group" aria-label="Stream Quality">
          {tiers.map((tier) => (
            <button
              key={tier}
              type="button"
              className={`${styles.hlsQualityBtn} ${
                selectedQuality === tier ? styles.hlsQualityActive : ''
              }`}
              onClick={() => handleQualityChange(tier)}
            >
              {tier === 'auto' ? 'Auto' : tier}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
