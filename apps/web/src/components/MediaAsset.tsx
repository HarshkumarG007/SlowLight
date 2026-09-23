import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useMediaAccess } from '../hooks/useMediaAccess';
import styles from './MediaViewer.module.css'; // Shared module for Media Components

export interface MediaAssetProps {
  assetId: string;
  kind: 'image' | 'video' | 'audio';
  variant: string;
  lqip?: string; // Base64 encoded LQIP string
  alt?: string;
}

export function MediaAsset({ assetId, kind, variant, lqip, alt }: MediaAssetProps) {
  const { getUrl, refreshUrl } = useMediaAccess();
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | HTMLImageElement>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(false);

    getUrl(assetId, variant).then(url => {
      if (mounted) {
        setSrc(url);
        setLoading(false);
      }
    }).catch(err => {
      console.warn('Failed to get media URL', err);
      if (mounted) {
        setError(true);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [assetId, variant, getUrl]);

  const handleError = async (_e: React.SyntheticEvent | null) => {
    // If we hit a 403 (likely expired signed URL), try to refresh it
    // HTML5 media elements don't directly expose HTTP status codes in the error event,
    // but a network error during playback usually sets networkState to NETWORK_NO_SOURCE.
    
    if (refreshing) return;
    setRefreshing(true);
    
    try {
      const newUrl = await refreshUrl(assetId, variant);
      
      // We need to restore playback position for video/audio
      let currentTime = 0;
      if (mediaRef.current && ('currentTime' in mediaRef.current)) {
        currentTime = mediaRef.current.currentTime;
      }

      setSrc(newUrl);

      // Once the new source is set, wait a tick and seek to previous time
      setTimeout(() => {
        if (mediaRef.current && ('currentTime' in mediaRef.current)) {
          mediaRef.current.currentTime = currentTime;
          mediaRef.current.play().catch(() => {
             // Autoplay might fail, ignore silently
          });
        }
        setRefreshing(false);
      }, 50);
      
    } catch {
      setError(true);
      setRefreshing(false);
    }
  };

  if (error) {
    return (
      <div className={styles.errorState}>
        <span>Media could not be loaded.</span>
        <button onClick={() => handleError(null)}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.assetContainer}>
      {/* LQIP Background if present */}
      {lqip && loading && kind === 'image' && (
        <img 
          src={`data:image/jpeg;base64,${lqip}`} 
          alt={alt || ''} 
          className={styles.lqip} 
        />
      )}
      
      {src && kind === 'image' && (
        <img 
          ref={mediaRef as React.RefObject<HTMLImageElement>}
          src={src} 
          alt={alt || ''} 
          className={styles.image}
          onError={handleError}
          onLoad={() => setLoading(false)}
        />
      )}

      {src && kind === 'video' && (
        <video 
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={src}
          className={styles.video}
          controls
          playsInline
          preload="metadata"
          onError={handleError}
        />
      )}

      {src && kind === 'audio' && (
        <audio 
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={src}
          className={styles.audio}
          controls
          preload="metadata"
          onError={handleError}
        />
      )}
    </div>
  );
}
