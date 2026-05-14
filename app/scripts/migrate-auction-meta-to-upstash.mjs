#!/usr/bin/env node
/**
 * One-shot migration: copy entries from <app>/data/auction-meta.json into
 * Upstash Redis under the same key prefix the API route uses.
 *
 * Usage:
 *   node scripts/migrate-auction-meta-to-upstash.mjs           # uses .env.local
 *   UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... node scripts/migrate-auction-meta-to-upstash.mjs
 *
 * Idempotent — re-runs simply overwrite the same keys.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Redis } from '@upstash/redis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '..');
const DATA_FILE = path.join(APP_DIR, 'data', 'auction-meta.json');
const ENV_FILE = path.join(APP_DIR, '.env.local');
const KEY_PREFIX = 'ebidz:auction-meta:';

async function loadEnvLocal() {
  try {
    const raw = await fs.readFile(ENV_FILE, 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local missing is fine — caller may have exported vars directly.
  }
}

async function main() {
  await loadEnvLocal();

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN.');
    console.error('Set them in app/.env.local or export them in your shell, then re-run.');
    process.exit(1);
  }

  let raw;
  try {
    raw = await fs.readFile(DATA_FILE, 'utf-8');
  } catch {
    console.error(`No data file at ${DATA_FILE} — nothing to migrate.`);
    process.exit(0);
  }

  let store;
  try {
    store = JSON.parse(raw);
  } catch (e) {
    console.error('Could not parse auction-meta.json:', e);
    process.exit(1);
  }

  const entries = Object.entries(store);
  if (entries.length === 0) {
    console.log('Data file is empty — nothing to migrate.');
    return;
  }

  const redis = new Redis({ url, token });
  console.log(`Migrating ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} to Upstash…`);

  let ok = 0;
  let failed = 0;
  for (const [auctionPda, meta] of entries) {
    try {
      await redis.set(KEY_PREFIX + auctionPda, meta);
      ok += 1;
      process.stdout.write(`  ✓ ${auctionPda}\n`);
    } catch (e) {
      failed += 1;
      process.stdout.write(`  ✗ ${auctionPda} — ${e instanceof Error ? e.message : String(e)}\n`);
    }
  }

  console.log(`\nDone — ${ok} succeeded, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Migration crashed:', e);
  process.exit(1);
});
