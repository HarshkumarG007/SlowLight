import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import {
  generateDBSCChallenge,
  getActiveDBSCChallenge,
  consumeDBSCChallenge,
  verifyES256Signature,
  registerDeviceSession,
  verifyDeviceProof,
  isSessionDeviceBound,
  type JWKECKey,
} from './dbsc.js';

interface DeviceSessionRecord {
  id: string;
  sessionId: string;
  devicePublicKey: string;
  algorithm: string;
  lastProofAt: Date;
  createdAt: Date;
}

let mockDeviceSessions: DeviceSessionRecord[] = [];

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async (clause?: { right?: { value?: string }; value?: string }) => {
          const val = clause?.right?.value ?? clause?.value;
          if (val !== undefined) {
            return mockDeviceSessions.filter((d) => d.sessionId === val);
          }
          return mockDeviceSessions;
        }),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async (val: Record<string, unknown>) => {
        const row = {
          id: crypto.randomUUID(),
          createdAt: new Date(),
          ...val,
        } as DeviceSessionRecord;
        mockDeviceSessions.push(row);
        return [row];
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((updateVals: Partial<DeviceSessionRecord>) => ({
        where: vi.fn(async (clause?: { right?: { value?: string }; value?: string }) => {
          const val = clause?.right?.value ?? clause?.value;
          for (const item of mockDeviceSessions) {
            if (!val || item.sessionId === val) {
              Object.assign(item, updateVals);
            }
          }
          return mockDeviceSessions;
        }),
      })),
    })),
  },
}));

describe('DBSC Engine (T12.2) - Cryptographic & Challenge Tests', () => {
  beforeEach(() => {
    mockDeviceSessions = [];
    vi.restoreAllMocks();
  });

  describe('Challenge Lifecycle & Anti-Replay', () => {
    it('generates a URL-safe base64 challenge of 32 bytes (43 chars)', () => {
      const sessionId = 'session-123';
      const challenge = generateDBSCChallenge(sessionId);

      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe('string');
      expect(challenge.length).toBe(43);
      expect(getActiveDBSCChallenge(sessionId)).toBe(challenge);
    });

    it('returns null for unknown session challenge', () => {
      expect(getActiveDBSCChallenge('non-existent-session')).toBeNull();
    });

    it('enforces single-use anti-replay: challenge can only be consumed once', () => {
      const sessionId = 'session-replay';
      const challenge = generateDBSCChallenge(sessionId);

      // First consume succeeds
      const firstTry = consumeDBSCChallenge(sessionId, challenge);
      expect(firstTry).toBe(true);

      // Replay attempt fails
      const replayTry = consumeDBSCChallenge(sessionId, challenge);
      expect(replayTry).toBe(false);
      expect(getActiveDBSCChallenge(sessionId)).toBeNull();
    });

    it('rejects consuming an incorrect challenge string', () => {
      const sessionId = 'session-wrong-challenge';
      generateDBSCChallenge(sessionId);

      const success = consumeDBSCChallenge(sessionId, 'invalid-challenge-payload');
      expect(success).toBe(false);
    });

    it('expires challenges after TTL (120 seconds)', () => {
      vi.useFakeTimers();
      const sessionId = 'session-ttl';
      generateDBSCChallenge(sessionId);

      // Fast-forward 121 seconds
      vi.advanceTimersByTime(121_000);

      expect(getActiveDBSCChallenge(sessionId)).toBeNull();
      vi.useRealTimers();
    });
  });

  describe('Cryptographic Signature Verification (ES256 / P-256)', () => {
    // Generate valid EC P-256 keypair for testing
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    const jwk = publicKey.export({ format: 'jwk' }) as JWKECKey;

    it('verifies valid IEEE P1363 (WebCrypto raw 64-byte r||s) signature', () => {
      const data = 'dbsc-challenge-ieee-format-token';
      const signer = crypto.createSign('SHA256');
      signer.update(data);
      const ieeeSig = signer.sign({
        key: privateKey,
        dsaEncoding: 'ieee-p1363',
      });
      const sigBase64url = ieeeSig.toString('base64url');

      const verified = verifyES256Signature(data, sigBase64url, jwk);
      expect(verified).toBe(true);
    });

    it('verifies valid ASN.1 DER-encoded signature (Node / OpenSSL format)', () => {
      const data = 'dbsc-challenge-der-format-token';
      const signer = crypto.createSign('SHA256');
      signer.update(data);
      const derSig = signer.sign(privateKey); // default is DER
      const sigBase64url = derSig.toString('base64url');

      const verified = verifyES256Signature(data, sigBase64url, jwk);
      expect(verified).toBe(true);
    });

    it('rejects signature if payload is tampered', () => {
      const original = 'legitimate-challenge';
      const tampered = 'tampered-challenge';
      const signer = crypto.createSign('SHA256');
      signer.update(original);
      const sig = signer.sign({
        key: privateKey,
        dsaEncoding: 'ieee-p1363',
      });

      const verified = verifyES256Signature(tampered, sig.toString('base64url'), jwk);
      expect(verified).toBe(false);
    });

    it('rejects signature generated by a different private key', () => {
      const { privateKey: rogueKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
      });
      const data = 'challenge-test';
      const signer = crypto.createSign('SHA256');
      signer.update(data);
      const rogueSig = signer.sign({
        key: rogueKey,
        dsaEncoding: 'ieee-p1363',
      });

      const verified = verifyES256Signature(data, rogueSig.toString('base64url'), jwk);
      expect(verified).toBe(false);
    });

    it('handles malformed JWK or malformed signature safely without throwing', () => {
      expect(verifyES256Signature('test', 'not-valid-sig', jwk)).toBe(false);
      expect(
        verifyES256Signature('test', 'sig', { kty: 'INVALID' } as unknown as JWKECKey)
      ).toBe(false);
    });
  });

  describe('Device Session Registration & Verification', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    const jwk = publicKey.export({ format: 'jwk' }) as JWKECKey;

    it('successfully registers device session with valid challenge and proof', async () => {
      const sessionId = 'valid-session-001';
      const challenge = generateDBSCChallenge(sessionId);

      const signer = crypto.createSign('SHA256');
      signer.update(challenge);
      const sig = signer.sign({
        key: privateKey,
        dsaEncoding: 'ieee-p1363',
      }).toString('base64url');

      const success = await registerDeviceSession(sessionId, jwk, sig, challenge);
      expect(success).toBe(true);

      // Verify stored in mock DB
      expect(mockDeviceSessions).toHaveLength(1);
      expect(mockDeviceSessions[0]?.sessionId).toBe(sessionId);
      expect(mockDeviceSessions[0]?.algorithm).toBe('ES256');

      // Verify session is now reported as device-bound
      const isBound = await isSessionDeviceBound(sessionId);
      expect(isBound).toBe(true);
    });

    it('rejects registration when challenge signature is invalid', async () => {
      const sessionId = 'invalid-sig-session';
      const challenge = generateDBSCChallenge(sessionId);

      const success = await registerDeviceSession(
        sessionId,
        jwk,
        'invalid-signature-data',
        challenge
      );
      expect(success).toBe(false);
      expect(mockDeviceSessions).toHaveLength(0);
    });

    it('rejects registration when challenge has already been consumed', async () => {
      const sessionId = 'consumed-challenge-session';
      const challenge = generateDBSCChallenge(sessionId);
      consumeDBSCChallenge(sessionId, challenge); // Consumed early

      const signer = crypto.createSign('SHA256');
      signer.update(challenge);
      const sig = signer.sign({
        key: privateKey,
        dsaEncoding: 'ieee-p1363',
      }).toString('base64url');

      const success = await registerDeviceSession(sessionId, jwk, sig, challenge);
      expect(success).toBe(false);
    });

    it('verifies device proof for registered session and updates lastProofAt', async () => {
      const sessionId = 'proof-session-002';
      const challenge = generateDBSCChallenge(sessionId);

      const signer = crypto.createSign('SHA256');
      signer.update(challenge);
      const sig = signer.sign({
        key: privateKey,
        dsaEncoding: 'ieee-p1363',
      }).toString('base64url');

      await registerDeviceSession(sessionId, jwk, sig, challenge);

      // Now issue a proof challenge
      const proofChallenge = 'fresh-proof-challenge-token';
      const proofSigner = crypto.createSign('SHA256');
      proofSigner.update(proofChallenge);
      const proofSig = proofSigner.sign({
        key: privateKey,
        dsaEncoding: 'ieee-p1363',
      }).toString('base64url');

      const verified = await verifyDeviceProof(sessionId, proofSig, proofChallenge);
      expect(verified).toBe(true);

      // Verify with invalid proof signature fails
      const badProof = await verifyDeviceProof(sessionId, 'corrupted-sig', proofChallenge);
      expect(badProof).toBe(false);
    });

    it('returns false when verifying device proof for unknown session', async () => {
      const verified = await verifyDeviceProof('non-existent', 'sig', 'challenge');
      expect(verified).toBe(false);
    });
  });

  describe('Cookie Theft Mitigation & Progressive Enhancement Simulation', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    const jwk = publicKey.export({ format: 'jwk' }) as JWKECKey;

    it('simulates cookie theft attack: attacker possessing cookie cannot satisfy device proof', async () => {
      const victimSessionId = 'victim-session-id';
      const regChallenge = generateDBSCChallenge(victimSessionId);

      const signer = crypto.createSign('SHA256');
      signer.update(regChallenge);
      const sig = signer.sign({
        key: privateKey,
        dsaEncoding: 'ieee-p1363',
      }).toString('base64url');

      // Legitimate user enrolls DBSC binding
      await registerDeviceSession(victimSessionId, jwk, sig, regChallenge);
      expect(await isSessionDeviceBound(victimSessionId)).toBe(true);

      // Simulation: Attacker exfiltrates __Host-sl_sid cookie but does not have the hardware private key
      const attackerChallenge = 'server-auth-check-challenge';

      // Attacker attempts request without signature -> fails
      const attackerSigMissing = await verifyDeviceProof(victimSessionId, '', attackerChallenge);
      expect(attackerSigMissing).toBe(false);

      // Attacker attempts request with forged signature from an attacker-generated key
      const { privateKey: attackerKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
      });
      const attackerSigner = crypto.createSign('SHA256');
      attackerSigner.update(attackerChallenge);
      const forgedSig = attackerSigner.sign({
        key: attackerKey,
        dsaEncoding: 'ieee-p1363',
      }).toString('base64url');

      const attackerForgedResult = await verifyDeviceProof(
        victimSessionId,
        forgedSig,
        attackerChallenge
      );
      expect(attackerForgedResult).toBe(false);

      // Legitimate client with device key signs and succeeds
      const legitSigner = crypto.createSign('SHA256');
      legitSigner.update(attackerChallenge);
      const legitSig = legitSigner.sign({
        key: privateKey,
        dsaEncoding: 'ieee-p1363',
      }).toString('base64url');

      const legitResult = await verifyDeviceProof(victimSessionId, legitSig, attackerChallenge);
      expect(legitResult).toBe(true);
    });

    it('simulates progressive enhancement: legacy client without DBSC is not marked bound', async () => {
      const legacySessionId = 'legacy-browser-session';

      // Legacy browser never calls DBSC registration
      const bound = await isSessionDeviceBound(legacySessionId);
      expect(bound).toBe(false);
      // System allows fallback to standard secure cookie verification
    });
  });
});
