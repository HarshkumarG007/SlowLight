import { describe, it, expect } from 'vitest';
import {
  generateE2EEKeyPair,
  computeKeyThumbprint,
  isE2EESealed,
  sealE2EE,
  unsealE2EE,
  uint8ArrayToBase64Url,
  base64UrlToUint8Array,
} from './e2ee.js';
import type { SealContext } from './types.js';

const ctx: SealContext = {
  table: 'letters',
  column: 'body_sealed',
  rowId: '11111111-2222-3333-4444-555555555555',
};

describe('Sealed Vault v2 E2EE Cryptographic Engine (T12.3)', () => {
  it('correctly identifies E2EE-sealed strings', () => {
    expect(isE2EESealed('v2.e2ee.kid.ephem.iv.wrap.ct')).toBe(true);
    expect(isE2EESealed('v1.kid.nonce.ct')).toBe(false);
    expect(isE2EESealed('plain text content')).toBe(false);
    expect(isE2EESealed('')).toBe(false);
  });

  it('round-trips Uint8Array to Base64URL encoding', () => {
    const raw = new Uint8Array([0, 1, 2, 250, 255, 128, 64]);
    const b64 = uint8ArrayToBase64Url(raw);
    const decoded = base64UrlToUint8Array(b64);
    expect(Array.from(decoded)).toEqual(Array.from(raw));
  });

  it('generates valid ECDH P-256 keypair and deterministic thumbprint', async () => {
    const { publicKeyJwk, privateKey } = await generateE2EEKeyPair();

    expect(publicKeyJwk.kty).toBe('EC');
    expect(publicKeyJwk.crv).toBe('P-256');
    expect(publicKeyJwk.x).toBeDefined();
    expect(publicKeyJwk.y).toBeDefined();
    expect(privateKey).toBeDefined();
    expect(privateKey.algorithm.name).toBe('ECDH');

    const thumbprint1 = await computeKeyThumbprint(publicKeyJwk);
    const thumbprint2 = await computeKeyThumbprint(publicKeyJwk);

    expect(thumbprint1).toBe(thumbprint2);
    expect(thumbprint1.length).toBeGreaterThan(20);
  });

  it('round-trips a standard ASCII message end-to-end', async () => {
    const recipient = await generateE2EEKeyPair();
    const recipientKid = await computeKeyThumbprint(recipient.publicKeyJwk);

    const secretMessage = 'In the quiet glow, this whisper is for you alone.';
    const sealed = await sealE2EE(secretMessage, recipient.publicKeyJwk, ctx, recipientKid);

    expect(isE2EESealed(sealed)).toBe(true);
    expect(sealed.startsWith('v2.e2ee.')).toBe(true);
    expect(sealed).not.toContain(secretMessage);

    const unsealed = await unsealE2EE(sealed, recipient.privateKey, ctx);
    expect(unsealed).toBe(secretMessage);
  });

  it('round-trips unicode payloads and empty strings', async () => {
    const recipient = await generateE2EEKeyPair();
    const recipientKid = await computeKeyThumbprint(recipient.publicKeyJwk);

    const unicodeText = '✨ 永远 💙 星光 αβγδ 🌟';
    const sealedUnicode = await sealE2EE(unicodeText, recipient.publicKeyJwk, ctx, recipientKid);
    expect(await unsealE2EE(sealedUnicode, recipient.privateKey, ctx)).toBe(unicodeText);

    const emptyText = '';
    const sealedEmpty = await sealE2EE(emptyText, recipient.publicKeyJwk, ctx, recipientKid);
    expect(await unsealE2EE(sealedEmpty, recipient.privateKey, ctx)).toBe(emptyText);
  });

  it('produces unique ciphertexts on each seal invocation due to ephemeral keys and IVs', async () => {
    const recipient = await generateE2EEKeyPair();
    const recipientKid = await computeKeyThumbprint(recipient.publicKeyJwk);
    const text = 'Repeated content';

    const sealed1 = await sealE2EE(text, recipient.publicKeyJwk, ctx, recipientKid);
    const sealed2 = await sealE2EE(text, recipient.publicKeyJwk, ctx, recipientKid);

    expect(sealed1).not.toBe(sealed2);
  });

  it('rejects unsealing if rowId in AAD is swapped (row-bound swapping protection)', async () => {
    const recipient = await generateE2EEKeyPair();
    const recipientKid = await computeKeyThumbprint(recipient.publicKeyJwk);

    const sealed = await sealE2EE('Row bound test', recipient.publicKeyJwk, ctx, recipientKid);

    const tamperedCtx: SealContext = {
      ...ctx,
      rowId: '99999999-9999-9999-9999-999999999999',
    };

    await expect(unsealE2EE(sealed, recipient.privateKey, tamperedCtx)).rejects.toThrow(
      'E2EE_DECRYPT_FAILED'
    );
  });

  it('rejects unsealing if table or column in AAD is swapped', async () => {
    const recipient = await generateE2EEKeyPair();
    const recipientKid = await computeKeyThumbprint(recipient.publicKeyJwk);

    const sealed = await sealE2EE('Table bound test', recipient.publicKeyJwk, ctx, recipientKid);

    const wrongTableCtx: SealContext = { ...ctx, table: 'memories' };
    await expect(unsealE2EE(sealed, recipient.privateKey, wrongTableCtx)).rejects.toThrow(
      'E2EE_DECRYPT_FAILED'
    );

    const wrongColCtx: SealContext = { ...ctx, column: 'title' };
    await expect(unsealE2EE(sealed, recipient.privateKey, wrongColCtx)).rejects.toThrow(
      'E2EE_DECRYPT_FAILED'
    );
  });

  it('rejects unsealing if ciphertext is tampered', async () => {
    const recipient = await generateE2EEKeyPair();
    const recipientKid = await computeKeyThumbprint(recipient.publicKeyJwk);

    const sealed = await sealE2EE('Integrity test', recipient.publicKeyJwk, ctx, recipientKid);
    const parts = sealed.split('.');

    // Tamper with the ciphertext component
    const ctBytes = base64UrlToUint8Array(parts[6]!);
    ctBytes[0] = (ctBytes[0] ?? 0) ^ 0xff;
    parts[6] = uint8ArrayToBase64Url(ctBytes);
    const tamperedSealed = parts.join('.');

    await expect(unsealE2EE(tamperedSealed, recipient.privateKey, ctx)).rejects.toThrow(
      'E2EE_DECRYPT_FAILED'
    );
  });

  it('rejects unsealing when attempted with wrong recipient private key', async () => {
    const recipient1 = await generateE2EEKeyPair();
    const recipient2 = await generateE2EEKeyPair();
    const kid1 = await computeKeyThumbprint(recipient1.publicKeyJwk);

    const sealed = await sealE2EE('Private letter for recipient 1', recipient1.publicKeyJwk, ctx, kid1);

    // Recipient 2 attempts to decrypt
    await expect(unsealE2EE(sealed, recipient2.privateKey, ctx)).rejects.toThrow();
  });

  it('rejects malformed envelopes missing required components', async () => {
    const recipient = await generateE2EEKeyPair();

    await expect(unsealE2EE('v2.e2ee.invalid', recipient.privateKey, ctx)).rejects.toThrow(
      'E2EE_FORMAT'
    );
    await expect(unsealE2EE('v1.not.v2.e2ee.data.here.ok', recipient.privateKey, ctx)).rejects.toThrow(
      'E2EE_FORMAT'
    );
  });
});
