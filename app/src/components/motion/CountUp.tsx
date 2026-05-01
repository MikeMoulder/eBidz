'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';

type Props = {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
};

export function CountUp({
  to,
  duration = 1.6,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const value = useMotionValue(0);
  const spring = useSpring(value, { duration: duration * 1000, bounce: 0 });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (inView) value.set(to);
  }, [inView, to, value]);

  useEffect(() => {
    return spring.on('change', (latest) => {
      setDisplay(
        latest.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }),
      );
    });
  }, [spring, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
