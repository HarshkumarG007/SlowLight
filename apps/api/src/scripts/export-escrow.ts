#!/usr/bin/env node
/**
 * export-escrow.ts
 *
 * Exports offline escrow recovery payload containing data encryption keys (DEKs).
 *
 * Spec §30 (Disaster Recovery & Offline Escrow):
 * - Reads DEKs and key registry entries.
 * - Seals the escrow payload using AES-256-GCM derived via scrypt.
 * - Computes cryptographic SHA-256 checksum for physical printout / safe storage.
 *
 * Usage:
 *   pnpm cli export-escrow [--out <path>] [--passphrase <passphrase>]
 */
import { parseArgs } from 'node:util';
import crypto, { randomBytes, createCipheriv, scryptSync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db/index.js';
import { keyRegistry } from '../db/schema.js';
import { logger } from '../observability/logger.js';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    out: { type: 'string', short: 'o' },
    passphrase: { type: 'string', short: 'p' },
  },
});

export async function exportEscrow(passphrase?: string, outPath?: string) {
  logger.info('Reading active cryptographic DEKs from key_registry...');

  const keys = await db.select().from(keyRegistry);

  if (keys.length === 0) {
    logger.warn('No keys found in key_registry. Using synthetic dev key for escrow drill.');
    keys.push({
      kid: 'dev-active-dek',
      purpose: 'sealed',
      wrappedDek: Buffer.alloc(32, 1),
      kmsKeyId: 'alias/sl-sealed',
      status: 'active',
      createdAt: new Date(),
      retiredAt: null,
    });
  }

  const escrowPayload = JSON.stringify({
    version: 'sl-escrow-v1',
    createdAt: new Date().toISOString(),
    keyCount: keys.length,
    keys: keys.map((k) => ({
      kid: k.kid,
      purpose: k.purpose,
      kmsKeyId: k.kmsKeyId,
      status: k.status,
      createdAt: k.createdAt,
      wrappedDekBase64: Buffer.from(k.wrappedDek).toString('base64'),
    })),
  }, null, 2);

  const phrase = passphrase || randomBytes(16).toString('hex');
  const salt = randomBytes(16);
  const iv = randomBytes(12);

  // Derive 256-bit encryption key using scrypt (N=16384, r=8, p=1)
  const derivedKey = scryptSync(phrase, salt, 32);

  const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(escrowPayload, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  const sealedEscrowBundle = {
    format: 'SL-OFFLINE-ESCROW-V1',
    algorithm: 'AES-256-GCM / SCRYPT',
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    ciphertext: ciphertext.toString('base64'),
    timestamp: new Date().toISOString(),
  };

  const bundleJson = JSON.stringify(sealedEscrowBundle, null, 2);
  const checksum = crypto.createHash('sha256').update(bundleJson).digest('hex');

  const destination = outPath || path.resolve(process.cwd(), `escrow-export-${Date.now()}.json`);
  fs.writeFileSync(destination, bundleJson, 'utf8');

  return {
    destination,
    keyCount: keys.length,
    checksum,
    passphrase: phrase,
  };
}

async function main() {
  logger.info('Starting Offline Escrow Export...');

  const result = await exportEscrow(values.passphrase, values.out);

  process.stdout.write(`\n╔════════════════════════════════════════════════════════════════════════════╗\n`);
  process.stdout.write(`║  SLOW LIGHT OFFLINE ESCROW BACKUP GENERATED                                ║\n`);
  process.stdout.write(`╠════════════════════════════════════════════════════════════════════════════╣\n`);
  process.stdout.write(`║ File Destination: ${result.destination.padEnd(57)}║\n`);
  process.stdout.write(`║ Encrypted Keys:   ${String(result.keyCount).padEnd(57)}║\n`);
  process.stdout.write(`║ SHA-256 Checksum: ${result.checksum.padEnd(57)}║\n`);
  process.stdout.write(`╠════════════════════════════════════════════════════════════════════════════╣\n`);
  process.stdout.write(`║  ESCROW PASSPHRASE (Print and store in physical safe / escrow):            ║\n`);
  process.stdout.write(`║  ${result.passphrase.padEnd(72)}║\n`);
  process.stdout.write(`╚════════════════════════════════════════════════════════════════════════════╝\n\n`);

  logger.info('Offline escrow bundle written successfully.');
}

if (process.argv[1]?.includes('export-escrow') || process.argv[1]?.includes('cli')) {
  main().catch((err) => {
    logger.error('Failed to export escrow:', err);
    process.exit(1);
  });
}
