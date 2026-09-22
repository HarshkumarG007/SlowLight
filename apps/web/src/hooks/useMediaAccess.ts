import { useCallback, useRef } from 'react';

// Global cache for signed URLs to prevent redundant fetching
// Key is `${assetId}:${variant}`, value is the signed URL.
const signedUrlCache = new Map<string, string>();

interface UseMediaAccessReturn {
  getUrl: (assetId: string, variant: string) => Promise<string>;
  refreshUrl: (assetId: string, variant: string) => Promise<string>;
  clearCache: (assetId: string, variant: string) => void;
}

export function useMediaAccess(): UseMediaAccessReturn {
  const fetchingRef = useRef<Map<string, Promise<string>>>(new Map());

  const fetchSignedUrl = async (assetId: string, variant: string, forceRefresh = false): Promise<string> => {
    const cacheKey = `${assetId}:${variant}`;
    
    if (!forceRefresh && signedUrlCache.has(cacheKey)) {
      return signedUrlCache.get(cacheKey)!;
    }

    if (fetchingRef.current.has(cacheKey)) {
      return fetchingRef.current.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      try {
        // Mocking the POST /media/access call
        // In reality, this would be an API client call returning { url: string }
        // We'll mock a short delay and return a pseudo-signed URL
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Mock URL that will "expire" occasionally if we want to test 403, 
        // but for now we just return a stable mock URL.
        const mockSignedUrl = `/_m/${assetId}/${variant}?Expires=${Date.now() + 900000}&Signature=mock&Key-Pair-Id=mock`;
        
        signedUrlCache.set(cacheKey, mockSignedUrl);
        return mockSignedUrl;
      } finally {
        fetchingRef.current.delete(cacheKey);
      }
    })();

    fetchingRef.current.set(cacheKey, fetchPromise);
    return fetchPromise;
  };

  const getUrl = useCallback((assetId: string, variant: string) => {
    return fetchSignedUrl(assetId, variant, false);
  }, []);

  const refreshUrl = useCallback((assetId: string, variant: string) => {
    return fetchSignedUrl(assetId, variant, true);
  }, []);

  const clearCache = useCallback((assetId: string, variant: string) => {
    signedUrlCache.delete(`${assetId}:${variant}`);
  }, []);

  return { getUrl, refreshUrl, clearCache };
}
