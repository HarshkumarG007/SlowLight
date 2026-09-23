/**
 * DBSC (Device-Bound Session Credentials) Client-Side Key Manager
 * Generates and holds a non-extractable ECDSA P-256 key pair in IndexedDB,
 * binding the session cookie to this physical device.
 */

const DB_NAME = 'sl_dbsc_vault';
const STORE_NAME = 'device_keys';
const KEY_ALIAS = 'session_device_key';

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Open IndexedDB store for device key pair.
 */
function openKeyStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get or create an ECDSA P-256 key pair stored in IndexedDB.
 */
export async function getOrCreateDeviceKeyPair(): Promise<CryptoKeyPair> {
  const db = await openKeyStore();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(KEY_ALIAS);

    getReq.onsuccess = async () => {
      if (getReq.result) {
        resolve(getReq.result as CryptoKeyPair);
        return;
      }

      // Generate new P-256 key pair
      try {
        const keyPair = await window.crypto.subtle.generateKey(
          {
            name: 'ECDSA',
            namedCurve: 'P-256',
          },
          false, // non-extractable private key
          ['sign']
        );

        const writeTx = db.transaction(STORE_NAME, 'readwrite');
        const writeStore = writeTx.objectStore(STORE_NAME);
        writeStore.put(keyPair, KEY_ALIAS);

        writeTx.oncomplete = () => resolve(keyPair);
        writeTx.onerror = () => reject(writeTx.error);
      } catch (err) {
        reject(err);
      }
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Registers the physical device key with the Slow Light backend.
 * Progressive enhancement: silently ignores unsupported platforms.
 */
export async function registerDeviceBoundSession(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.crypto?.subtle || !window.indexedDB) {
    return false;
  }

  try {
    // 1. Fetch challenge from server
    const challengeRes = await fetch('/api/auth/dbsc/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!challengeRes.ok) return false;
    const { challenge } = (await challengeRes.json()) as { challenge: string };
    if (!challenge) return false;

    // 2. Load or generate device key pair
    const keyPair = await getOrCreateDeviceKeyPair();

    // 3. Export public key to JWK
    const jwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);

    // 4. Sign the challenge with the non-extractable private key
    const challengeBytes = new TextEncoder().encode(challenge);
    const signatureBuffer = await window.crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      keyPair.privateKey,
      challengeBytes
    );

    const signature = bufferToBase64Url(signatureBuffer);

    // 5. Submit proof to backend registration endpoint
    const registerRes = await fetch('/api/auth/dbsc/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jwk,
        signature,
        challenge,
      }),
    });

    return registerRes.ok;
  } catch {
    // Graceful fallback for progressive enhancement
    return false;
  }
}

/**
 * Check if the active session is hardware/device bound.
 */
export async function checkDeviceBindingStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/dbsc/status');
    if (!res.ok) return false;
    const data = (await res.json()) as { bound: boolean };
    return Boolean(data.bound);
  } catch {
    return false;
  }
}
