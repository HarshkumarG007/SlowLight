#!/usr/bin/env node
/**
 * cli.ts — Slow Light Unified CLI Dispatcher
 *
 * Implements the administrative CLI specified in AGENTS.md and Master Spec:
 *   pnpm cli <cmd> [args]
 *
 * Supported Commands:
 *   - bootstrap      : Create initial Author user & mint first-time passkey enrollment invite
 *   - invite:create  : Mint single-use passkey enrollment invite with Diceware phrase
 *   - admin-door     : Update AWS WAF IP Set to allow or block dynamic Author IP
 *   - keys:rotate    : Execute cryptographic envelope key rotation drill
 *   - restore-drill  : Execute disaster recovery restore drill
 *   - export-escrow  : Export offline encrypted escrow backup of DEKs
 *   - soft-launch    : Clean database and prepare for initial live production launch
 *   - load-test      : Run distributed load/abuse rate limit tests
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COMMAND_MAP: Record<string, string> = {
  'bootstrap': 'bootstrap.ts',
  'invite:create': 'invite-create.ts',
  'invite-create': 'invite-create.ts',
  'admin-door': 'admin-door.ts',
  'keys:rotate': 'keys-rotate.ts',
  'keys-rotate': 'keys-rotate.ts',
  'restore-drill': 'restore-drill.ts',
  'export-escrow': 'export-escrow.ts',
  'soft-launch': 'soft-launch.ts',
  'load-test': 'load-test.ts',
};

function printHelp() {
  process.stdout.write(`
Slow Light — Sanctuary CLI Suite

Usage:
  pnpm cli <command> [options]

Commands:
  bootstrap        Initialize Author account and print first-time enrollment link
  invite:create    Generate single-use passkey enrollment invite (--role <recipient|author>)
  admin-door       Actuate dynamic AWS WAF IP gate (--ip <ip> [--action add|remove])
  keys:rotate      Perform KMS envelope key rotation drill ([--dry-run])
  restore-drill    Verify RTO/RPO disaster recovery procedures
  export-escrow    Export encrypted offline DEK escrow bundle ([--out <file>])
  soft-launch      Purge synthetic data and verify database health ([--confirm])
  load-test        Execute rate limit abuse verification harness

Examples:
  pnpm cli bootstrap
  pnpm cli invite:create --role recipient
  pnpm cli admin-door --ip 203.0.113.42 --action add
  pnpm cli keys:rotate --dry-run
  pnpm cli export-escrow --out escrow-backup.json
  pnpm cli soft-launch --confirm
\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    printHelp();
    process.exit(0);
  }

  const scriptFile = COMMAND_MAP[command];
  if (!scriptFile) {
    process.stderr.write(`Unknown command: "${command}"\n`);
    printHelp();
    process.exit(1);
  }

  const scriptPath = path.resolve(__dirname, scriptFile);
  const forwardArgs = args.slice(1);

  // Set process.argv so the target script's parseArgs sees the forward arguments
  process.argv = [process.argv[0] ?? 'node', scriptPath, ...forwardArgs];

  // In-process dynamic import avoids cross-platform shell quoting issues
  const scriptUrl = pathToFileURL(scriptPath).href;
  await import(scriptUrl);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
