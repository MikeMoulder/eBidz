/**
 * Shared off-chain auction metadata store.
 *
 * The Anchor program has no on-chain field for human-readable title/description/image,
 * so the auction creator submits these via this API at launch. Other visitors fetch
 * them here so the metadata isn't locked to the creator's browser localStorage.
 *
 * Primary backend: Upstash Redis (set UPSTASH_REDIS_REST_URL +
 * UPSTASH_REDIS_REST_TOKEN). This works on Vercel, Cloudflare, or any host —
 * the SDK talks HTTPS to Upstash directly.
 *
 * Fallback for local dev without those env vars: a JSON file at
 * <cwd>/data/auction-meta.json. Do NOT rely on this in production on
 * serverless platforms — their filesystems are ephemeral.
 */
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Meta = {
  title?: string;
  description?: string;
  imageUrl?: string;
  updatedAt: number;
};

const KEY_PREFIX = 'ebidz:auction-meta:';

// ── Backend selection ────────────────────────────────────────────────────────

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = upstashUrl && upstashToken
  ? new Redis({ url: upstashUrl, token: upstashToken })
  : null;

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'auction-meta.json');

async function fileRead(): Promise<Record<string, Meta>> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, Meta>) : {};
  } catch {
    return {};
  }
}

async function fileWrite(store: Record<string, Meta>): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

async function readMeta(auctionPda: string): Promise<Meta | null> {
  if (redis) {
    const value = await redis.get<Meta>(KEY_PREFIX + auctionPda);
    return value ?? null;
  }
  const store = await fileRead();
  return store[auctionPda] ?? null;
}

async function writeMeta(auctionPda: string, meta: Meta): Promise<void> {
  if (redis) {
    await redis.set(KEY_PREFIX + auctionPda, meta);
    return;
  }
  const store = await fileRead();
  store[auctionPda] = meta;
  await fileWrite(store);
}

// ── Handlers ─────────────────────────────────────────────────────────────────

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const auctionPda = searchParams.get('auctionPda');
  if (!auctionPda) {
    return NextResponse.json({ error: 'auctionPda required' }, { status: 400 });
  }
  try {
    const entry = await readMeta(auctionPda);
    return NextResponse.json(entry);
  } catch (e) {
    return NextResponse.json({ error: 'read failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const auctionPda = pickString(body?.auctionPda);
  if (!auctionPda) {
    return NextResponse.json({ error: 'auctionPda required' }, { status: 400 });
  }

  const meta: Meta = {
    title: pickString(body?.title),
    description: pickString(body?.description),
    imageUrl: pickString(body?.imageUrl),
    updatedAt: Date.now(),
  };

  try {
    await writeMeta(auctionPda, meta);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'write failed' }, { status: 500 });
  }
}
