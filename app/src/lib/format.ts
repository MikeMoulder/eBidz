export const LAMPORTS_PER_SOL = 1_000_000_000;

export function formatSol(lamports: number, decimals = 2): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  return sol.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function shortAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export type TimeRemaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  expired: boolean;
};

export function formatTimeRemaining(deadline: number): TimeRemaining {
  const now = Date.now();
  const total = Math.max(0, deadline - now);
  const expired = total === 0;
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);
  return { days, hours, minutes, seconds, total, expired };
}

export function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function relativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
