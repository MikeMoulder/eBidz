'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

const GLYPHS = '01ABCDEF#%&*@$?!+~×÷';

function randomChar() {
    return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

type Props = {
    text: string;
    /** ms before scramble starts (matches ScrollReveal delay) */
    startDelay?: number;
    /** ms per character reveal step */
    revealInterval?: number;
    /** ms between glitch ticks on unsettled chars */
    glitchInterval?: number;
    className?: string;
};

export function ScrambleReveal({
    text,
    startDelay = 300,
    revealInterval = 60,
    glitchInterval = 40,
    className,
}: Props) {
    // Initialize with real text so SSR and first client render match (no hydration mismatch)
    const [chars, setChars] = useState<string[]>(() => text.split(''));
    const revealed = useRef(text.length);
    const spanRef = useRef<HTMLSpanElement>(null);
    // Refs to active timers so we can cancel before replaying
    const glitchRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const revealDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const revealStepRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearAll = useCallback(() => {
        if (glitchRef.current) clearInterval(glitchRef.current);
        if (revealDelayRef.current) clearTimeout(revealDelayRef.current);
        if (revealStepRef.current) clearInterval(revealStepRef.current);
    }, []);

    const play = useCallback(() => {
        clearAll();
        revealed.current = 0;
        setChars(text.split('').map((c) => (c === ' ' ? ' ' : randomChar())));

        glitchRef.current = setInterval(() => {
            setChars((prev) =>
                prev.map((c, i) => {
                    if (i < revealed.current) return text[i];
                    return text[i] === ' ' ? ' ' : randomChar();
                }),
            );
        }, glitchInterval);

        revealDelayRef.current = setTimeout(() => {
            revealStepRef.current = setInterval(() => {
                if (revealed.current >= text.length) {
                    clearAll();
                    setChars(text.split(''));
                    return;
                }
                revealed.current += 1;
            }, revealInterval);
        }, startDelay);
    }, [text, startDelay, revealInterval, glitchInterval, clearAll]);

    useEffect(() => {
        // Play once on mount (after hydration)
        play();

        // Re-play every time the element enters the viewport
        const el = spanRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) play();
            },
            { threshold: 0.5 },
        );
        observer.observe(el);

        return () => {
            observer.disconnect();
            clearAll();
        };
    }, [play, clearAll]);

    return (
        <span ref={spanRef} className={cn('inline', className)}>
            {chars.map((c, i) => (
                <span
                    key={i}
                    className={
                        i < revealed.current || chars[i] === text[i]
                            ? ''
                            : 'text-accent-primary/60'
                    }
                >
                    {c}
                </span>
            ))}
        </span>
    );
}
