"use client";

import { useState, useEffect, memo } from 'react';

const BackgroundAnimation = memo(function BackgroundAnimation() {
    const [mounted, setMounted] = useState(false);

    // Full Screen Grid Configuration
    const COLS = 32;
    const ROWS = 18;
    const TOTAL = COLS * ROWS;

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="fixed inset-0 -z-10 bg-[var(--bg-root)]" />;

    // Calculate delay based on distance from center
    const getDelay = (index: number) => {
        const col = index % COLS;
        const row = Math.floor(index / COLS);

        // Center coordinates
        const cx = COLS / 2;
        const cy = ROWS / 2;

        // Euclidean distance
        const dist = Math.sqrt(Math.pow(col - cx, 2) + Math.pow(row - cy, 2));

        // 100ms per unit of distance
        return dist * 100;
    };

    return (
        <div className="fixed inset-0 -z-10 flex items-center justify-center pointer-events-none overflow-hidden bg-[var(--bg-root)]">
            <style jsx global>{`
        @keyframes breathe {
          0% { transform: scale(0.1); opacity: 0.1; }
          50% { transform: scale(0.9); opacity: 0.25; }
          100% { transform: scale(0.1); opacity: 0.1; }
        }
      `}</style>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                    gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                    width: '100vw',
                    height: '100vh',
                    gap: '1px',
                }}
            >
                {Array.from({ length: TOTAL }).map((_, i) => (
                    <div
                        key={i}
                        className="w-full h-full bg-[var(--text-main)]"
                        style={{
                            opacity: 0.1,
                            transform: 'scale(0.1)',
                            borderRadius: '1px',
                            // Use inline animation with calculated delay
                            animation: `breathe 4s ease-in-out infinite`,
                            animationDelay: `${getDelay(i)}ms`,
                            willChange: 'transform, opacity', // Optimization hint
                            backfaceVisibility: 'hidden',     // Hardware acceleration hint
                        }}
                    />
                ))}
            </div>
        </div>
    );
});

export default BackgroundAnimation;
