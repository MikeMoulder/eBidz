'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

const HEX = '0123456789ABCDEF';

function randomHex(len: number) {
  let out = '0x';
  for (let i = 0; i < len; i++) {
    out += HEX[Math.floor(Math.random() * 16)];
  }
  return out;
}

function placeholder(len: number) {
  return '0x' + '·'.repeat(len);
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
    setText(randomHex(length));
    const id = setInterval(() => setText(randomHex(length)), intervalMs);
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
