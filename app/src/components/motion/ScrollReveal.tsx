'use client';

import { motion, type Variants } from 'framer-motion';
import * as React from 'react';

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

const offset = (dir: Direction, distance: number) => {
  switch (dir) {
    case 'up':
      return { y: distance };
    case 'down':
      return { y: -distance };
    case 'left':
      return { x: distance };
    case 'right':
      return { x: -distance };
    default:
      return {};
  }
};

type Props = {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: Direction;
  distance?: number;
  className?: string;
  once?: boolean;
  margin?: string;
  as?: 'div' | 'section' | 'article' | 'aside' | 'header';
};

export function ScrollReveal({
  children,
  delay = 0,
  duration = 0.6,
  direction = 'up',
  distance = 24,
  className,
  once = true,
  margin = '-80px',
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, ...offset(direction, distance) }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: margin as `${number}px` }}
      transition={{ duration, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger a group of children. Wrap each child in `<ScrollRevealItem>`.
 */
export function ScrollRevealStagger({
  children,
  delay = 0,
  staggerChildren = 0.08,
  className,
  once = true,
  margin = '-80px',
}: {
  children: React.ReactNode;
  delay?: number;
  staggerChildren?: number;
  className?: string;
  once?: boolean;
  margin?: string;
}) {
  const containerVariants: Variants = {
    hidden: {},
    show: {
      transition: { delayChildren: delay, staggerChildren },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: margin as `${number}px` }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE },
  },
};

export function ScrollRevealItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
