import type { SealContext } from './types.js';

export const E2EE_VERSION = 'v2.e2ee';

/**
 * Encodes a Uint8Array to a URL-safe Base64 string without padding.
 */
export function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64url');
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]!);
  }
  return btoa(bin)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes a URL-safe Base64 string into a Uint8Array.
 */
export function base64UrlToUint8Array(base64url: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64url, 'base64url');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

/**
 * Returns true if a string is in the Sealed Vault v2 client-side E2EE envelope format.
 */
export function isE2EESealed(value: string): boolean {
  return typeof value === 'string' && value.startsWith(`${E2EE_VERSION}.`);
}

/**
 * Generates an RFC 7638 SHA-256 thumbprint for an EC P-256 JWK.
 */
export async function computeKeyThumbprint(jwk: JsonWebKey): Promise<string> {
  const canonical = JSON.stringify({
    crv: jwk.crv,
    kty: jwk.kty,
    x: jwk.x,
    y: jwk.y,
  });
  const data = new TextEncoder().encode(canonical);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return uint8ArrayToBase64Url(new Uint8Array(digest));
}

/**
 * Generates a new ECDH P-256 keypair for E2EE messaging using WebCrypto.
 */
export async function generateE2EEKeyPair(): Promise<{
  publicKeyJwk: JsonWebKey;
  privateKey: CryptoKey;
}> {
  const keyPair = await globalThis.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
  const publicKeyJwk = await globalThis.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  return { publicKeyJwk, privateKey: keyPair.privateKey };
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

/**
 * Constructs the row-bound Associated Authenticated Data (AAD) buffer.
 */
function buildE2EEAad(ctx: SealContext, recipientKid: string): ArrayBuffer {
  const aadString = `sl:${E2EE_VERSION}|${ctx.table}|${ctx.column}|${ctx.rowId}|${recipientKid}`;
  return toArrayBuffer(new TextEncoder().encode(aadString));
}

/**
 * Seals a plaintext string client-side for a specific recipient using WebCrypto.
 *
 * Envelope format:
 * v2.e2ee.<recipientKid>.<ephemeralPubJWK_b64url>.<iv_b64url>.<wrappedCek_b64url>.<ciphertext_b64url>
 */
export async function sealE2EE(
  plainText: string,
  recipientPublicKeyJwk: JsonWebKey,
  ctx: SealContext,
  recipientKid: string
): Promise<string> {
  const { subtle } = globalThis.crypto;

  // 1. Import Recipient's ECDH public key
  const recipientKey = await subtle.importKey(
    'jwk',
    recipientPublicKeyJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // 2. Generate random 256-bit AES-GCM Content Encryption Key (CEK)
  const cek = await subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // 3. Encrypt plaintext with CEK + row-bound AAD
  const iv = toArrayBuffer(globalThis.crypto.getRandomValues(new Uint8Array(12)));
  const aad = buildE2EEAad(ctx, recipientKid);
  const plainBytes = toArrayBuffer(new TextEncoder().encode(plainText));

  const ctBuffer = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: aad,
    },
    cek,
    plainBytes
  );

  // 4. Generate Ephemeral ECDH keypair for forward-secret key agreement
  const ephemeral = await subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
  const ephemeralPubJwk = await subtle.exportKey('jwk', ephemeral.publicKey);

  // 5. Derive AES-KW Key Encryption Key (KEK) using ECDH
  const kek = await subtle.deriveKey(
    {
      name: 'ECDH',
      public: recipientKey,
    },
    ephemeral.privateKey,
    {
      name: 'AES-KW',
      length: 256,
    },
    false,
    ['wrapKey']
  );

  // 6. Wrap CEK using AES-KW
  const wrappedCekBuffer = await subtle.wrapKey('raw', cek, kek, 'AES-KW');

  // 7. Format envelope
  const ephemeralJwkBytes = new TextEncoder().encode(JSON.stringify(ephemeralPubJwk));
  const parts = [
    'v2',
    'e2ee',
    recipientKid,
    uint8ArrayToBase64Url(ephemeralJwkBytes),
    uint8ArrayToBase64Url(new Uint8Array(iv)),
    uint8ArrayToBase64Url(new Uint8Array(wrappedCekBuffer)),
    uint8ArrayToBase64Url(new Uint8Array(ctBuffer)),
  ];

  return parts.join('.');
}

/**
 * Unseals an E2EE envelope client-side using the recipient's private key.
 */
export async function unsealE2EE(
  sealed: string,
  recipientPrivateKey: CryptoKey,
  ctx: SealContext
): Promise<string> {
  const parts = sealed.split('.');
  if (parts.length !== 7) {
    throw new Error('E2EE_FORMAT');
  }

  const [v, marker, recipientKid, ephemJwkStr, ivStr, wrappedCekStr, ctStr] = parts;
  if (
    v !== 'v2' ||
    marker !== 'e2ee' ||
    !recipientKid ||
    !ephemJwkStr ||
    !ivStr ||
    !wrappedCekStr ||
    !ctStr
  ) {
    throw new Error('E2EE_FORMAT');
  }

  const { subtle } = globalThis.crypto;

  // 1. Parse Ephemeral Public Key
  let ephemeralPubJwk: JsonWebKey;
  try {
    const jwkJson = new TextDecoder().decode(base64UrlToUint8Array(ephemJwkStr));
    ephemeralPubJwk = JSON.parse(jwkJson) as JsonWebKey;
  } catch {
    throw new Error('E2EE_FORMAT');
  }

  let ephemeralPubKey: CryptoKey;
  try {
    ephemeralPubKey = await subtle.importKey(
      'jwk',
      ephemeralPubJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );
  } catch {
    throw new Error('E2EE_FORMAT');
  }

  // 2. Derive AES-KW KEK using Recipient Private Key and Ephemeral Public Key
  let kek: CryptoKey;
  try {
    kek = await subtle.deriveKey(
      {
        name: 'ECDH',
        public: ephemeralPubKey,
      },
      recipientPrivateKey,
      {
        name: 'AES-KW',
        length: 256,
      },
      false,
      ['unwrapKey']
    );
  } catch {
    throw new Error('E2EE_DERIVE_FAILED');
  }

  // 3. Unwrap CEK
  const wrappedCekBytes = toArrayBuffer(base64UrlToUint8Array(wrappedCekStr));
  let cek: CryptoKey;
  try {
    cek = await subtle.unwrapKey(
      'raw',
      wrappedCekBytes,
      kek,
      'AES-KW',
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  } catch {
    throw new Error('E2EE_UNWRAP_FAILED');
  }

  // 4. Decrypt AES-GCM ciphertext verifying row-bound AAD
  const ivBytes = base64UrlToUint8Array(ivStr);
  if (ivBytes.length !== 12) {
    throw new Error('E2EE_FORMAT');
  }
  const iv = toArrayBuffer(ivBytes);

  const ctBytes = toArrayBuffer(base64UrlToUint8Array(ctStr));
  const aad = buildE2EEAad(ctx, recipientKid);

  try {
    const decryptedBuffer = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: aad,
      },
      cek,
      ctBytes
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch {
    throw new Error('E2EE_DECRYPT_FAILED');
  }
}
