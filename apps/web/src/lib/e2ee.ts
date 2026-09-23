/**
 * Sealed Vault v2 (E2EE) Client-Side Key Manager & Cryptographic Operations
 * Uses WebCrypto ECDH P-256 and IndexedDB to ensure zero server-side exposure of private text.
 */
import {
  generateE2EEKeyPair,
  computeKeyThumbprint,
  sealE2EE,
  unsealE2EE,
  isE2EESealed,
  type SealContext,
} from '@slow-light/shared';

const DB_NAME = 'sl_e2ee_vault';
const STORE_NAME = 'e2ee_keys';
const KEY_ALIAS = 'device_e2ee_keypair';
const THUMBPRINT_ALIAS = 'device_e2ee_thumbprint';
const JWK_ALIAS = 'device_e2ee_public_jwk';

export interface StoredE2EEData {
  kid: string;
  publicKeyJwk: JsonWebKey;
  privateKey: CryptoKey;
}

function openE2EEKeyStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available in this environment'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves or creates a device-bound ECDH P-256 keypair in IndexedDB.
 */
export async function getOrCreateE2EEKey(): Promise<StoredE2EEData> {
  try {
    const idb = await openE2EEKeyStore();

    return await new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const privReq = store.get(KEY_ALIAS);
      const kidReq = store.get(THUMBPRINT_ALIAS);
      const jwkReq = store.get(JWK_ALIAS);

      tx.oncomplete = async () => {
        if (privReq.result && kidReq.result && jwkReq.result) {
          resolve({
            kid: kidReq.result as string,
            publicKeyJwk: jwkReq.result as JsonWebKey,
            privateKey: privReq.result as CryptoKey,
          });
          return;
        }

        // Generate a new keypair
        try {
          const { publicKeyJwk, privateKey } = await generateE2EEKeyPair();
          const kid = await computeKeyThumbprint(publicKeyJwk);

          const writeTx = idb.transaction(STORE_NAME, 'readwrite');
          const writeStore = writeTx.objectStore(STORE_NAME);
          writeStore.put(privateKey, KEY_ALIAS);
          writeStore.put(kid, THUMBPRINT_ALIAS);
          writeStore.put(publicKeyJwk, JWK_ALIAS);

          writeTx.oncomplete = () => {
            resolve({ kid, publicKeyJwk, privateKey });
          };
          writeTx.onerror = () => reject(writeTx.error);
        } catch (err) {
          reject(err);
        }
      };

      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ephemeral fallback if IndexedDB is blocked/unavailable
    const { publicKeyJwk, privateKey } = await generateE2EEKeyPair();
    const kid = await computeKeyThumbprint(publicKeyJwk);
    return { kid, publicKeyJwk, privateKey };
  }
}

/**
 * Registers the device's public ECDH key with the backend API.
 */
export async function registerE2EEPublicKey(): Promise<boolean> {
  try {
    const { kid, publicKeyJwk } = await getOrCreateE2EEKey();

    const res = await fetch('/api/auth/e2ee/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kid,
        publicKey: publicKeyJwk,
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetches all enrolled public E2EE keys from the backend.
 */
export async function fetchE2EEPublicKeys(): Promise<
  Array<{ kid: string; userId: string; publicKey: JsonWebKey }>
> {
  try {
    const res = await fetch('/api/auth/e2ee/keys');
    if (!res.ok) return [];
    const data = (await res.json()) as {
      keys: Array<{ kid: string; userId: string; publicKey: JsonWebKey }>;
    };
    return data.keys || [];
  } catch {
    return [];
  }
}

/**
 * Unseals a content string if it was encrypted with Sealed Vault v2 client-side E2EE.
 * If the string is not E2EE sealed, returns the original string unaltered.
 */
export async function unsealContentIfE2EE(
  content: string,
  ctx: SealContext
): Promise<{ unsealed: string; isE2EE: boolean }> {
  if (!isE2EESealed(content)) {
    return { unsealed: content, isE2EE: false };
  }

  try {
    const { privateKey } = await getOrCreateE2EEKey();
    const unsealed = await unsealE2EE(content, privateKey, ctx);
    return { unsealed, isE2EE: true };
  } catch {
    return { unsealed: '✦ [Locked: Device key unable to decrypt sealed whisper]', isE2EE: true };
  }
}

/**
 * Runs an in-browser end-to-end cryptographic benchmark for the diagnostics panel.
 */
export async function runE2EERoundtripBenchmark(): Promise<{
  durationMs: number;
  thumbprint: string;
  success: boolean;
}> {
  const start = performance.now();
  const { kid, publicKeyJwk, privateKey } = await getOrCreateE2EEKey();

  const sampleContext: SealContext = {
    table: 'benchmark',
    column: 'test_payload',
    rowId: '00000000-0000-0000-0000-000000000000',
  };

  const samplePlain = '✦ Sealed Vault v2 Benchmark: End-to-end client-side privacy verified.';
  const sealed = await sealE2EE(samplePlain, publicKeyJwk, sampleContext, kid);
  const unsealed = await unsealE2EE(sealed, privateKey, sampleContext);

  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  const success = unsealed === samplePlain;

  return {
    durationMs,
    thumbprint: kid,
    success,
  };
}
