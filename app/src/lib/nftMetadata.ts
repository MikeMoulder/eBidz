/**
 * Metaplex Token Metadata helpers — fetch on-chain NFT name/image and
 * verify wallet ownership without pulling in the full @metaplex-foundation
 * SDK.
 */
import { Connection, PublicKey } from '@solana/web3.js';

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

export type OnchainNft = {
  name: string;
  symbol: string;
  uri: string;
  image?: string;
  decimals: number;
};

export function metadataPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID,
  )[0];
}

function ataFor(owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

function readBorshString(buf: Buffer, offset: number, paddedLen: number): { value: string; next: number } {
  const declared = buf.readUInt32LE(offset);
  const start = offset + 4;
  const slice = buf.subarray(start, start + Math.min(declared, paddedLen));
  const value = slice.toString('utf8').replace(/\0+$/g, '').trim();
  return { value, next: start + paddedLen };
}

/**
 * Token Metadata v1 layout (legacy + recent are compatible for these fields):
 *   key(1) + update_authority(32) + mint(32)
 *   + name [u32_len | 32 bytes padded]
 *   + symbol [u32_len | 10 bytes padded]
 *   + uri [u32_len | 200 bytes padded]
 */
export function parseMetadataAccount(data: Buffer): { name: string; symbol: string; uri: string } | null {
  if (data.length < 320) return null;
  const nameField = readBorshString(data, 65, 32);
  const symbolField = readBorshString(data, nameField.next, 10);
  const uriField = readBorshString(data, symbolField.next, 200);
  if (!uriField.value) return null;
  return { name: nameField.value, symbol: symbolField.value, uri: uriField.value };
}

async function fetchMintDecimals(connection: Connection, mint: PublicKey): Promise<number | null> {
  const info = await connection.getAccountInfo(mint, 'confirmed');
  if (!info || info.data.length < 45) return null;
  return info.data[44];
}

async function fetchUriJson(uri: string, timeoutMs = 6000): Promise<{ image?: string; name?: string } | null> {
  const normalized = uri.startsWith('ipfs://')
    ? `https://ipfs.io/ipfs/${uri.slice('ipfs://'.length)}`
    : uri;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(normalized, { signal: controller.signal });
    if (!res.ok) return null;
    const json = await res.json();
    const image = typeof json?.image === 'string' ? json.image : undefined;
    const name = typeof json?.name === 'string' ? json.name : undefined;
    return { image: normalizeImageUrl(image), name };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${url.slice('ipfs://'.length)}`;
  }
  return url;
}

export async function fetchOnchainNft(connection: Connection, mint: PublicKey): Promise<OnchainNft | null> {
  const [metaInfo, decimals] = await Promise.all([
    connection.getAccountInfo(metadataPda(mint), 'confirmed'),
    fetchMintDecimals(connection, mint),
  ]);

  if (decimals === null) return null;
  if (!metaInfo) {
    return { name: '', symbol: '', uri: '', decimals };
  }
  const parsed = parseMetadataAccount(metaInfo.data);
  if (!parsed) {
    return { name: '', symbol: '', uri: '', decimals };
  }

  const offchain = await fetchUriJson(parsed.uri);
  return {
    name: offchain?.name || parsed.name,
    symbol: parsed.symbol,
    uri: parsed.uri,
    image: offchain?.image,
    decimals,
  };
}

/** Read the wallet's ATA balance for this mint. Returns 0 if the ATA doesn't exist. */
export async function tokenBalanceOf(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey,
): Promise<bigint> {
  const ata = ataFor(owner, mint);
  const info = await connection.getAccountInfo(ata, 'confirmed');
  if (!info || info.data.length < 72) return 0n;
  return info.data.readBigUInt64LE(64);
}
