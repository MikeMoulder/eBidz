'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

// Solana addresses + signatures use base58 (no 0, O, I, or l).
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function randomBase58(len: number) {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += BASE58[Math.floor(Math.random() * BASE58.length)];
  }
  return out;
}

function placeholder(len: number) {
  return '·'.repeat(len);
}

type Props = {
  length?: number;
  className?: string;
  intervalMs?: number;
};

export function CiphertextScramble({
  length = 6,
  className,
  intervalMs = 130,
}: Props) {
  const [text, setText] = useState(() => placeholder(length));

  useEffect(() => {
    setText(randomBase58(length));
    const id = setInterval(() => setText(randomBase58(length)), intervalMs);
    return () => clearInterval(id);
  }, [length, intervalMs]);

  return (
    <span
      className={cn(
        'font-mono tabular-nums text-accent-bright/85',
        className,
      )}
    >
      {text}
    </span>
  );
}
