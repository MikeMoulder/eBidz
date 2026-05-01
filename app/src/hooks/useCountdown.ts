'use client';

import { useEffect, useState } from 'react';
import { formatTimeRemaining, type TimeRemaining } from '@/lib/format';

const PLACEHOLDER: TimeRemaining = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  total: 1,
  expired: false,
};

export function useCountdown(deadline: number): TimeRemaining {
  // Stable placeholder on first paint avoids server/client mismatch
  // (Date.now() differs between render contexts).
  const [time, setTime] = useState<TimeRemaining>(PLACEHOLDER);

  useEffect(() => {
    setTime(formatTimeRemaining(deadline));
    const id = setInterval(
      () => setTime(formatTimeRemaining(deadline)),
      1000,
    );
    return () => clearInterval(id);
  }, [deadline]);

  return time;
}
