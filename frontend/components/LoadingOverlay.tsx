import React, { useState, useEffect, useRef } from 'react';
import { useAnime } from '../hooks/useAnime';
// @ts-ignore
import { animate, stagger } from 'animejs';

interface LoadingOverlayProps {
    message?: string;
    subMessage?: string;
}

const DEFAULT_MESSAGES = [
    "ALLOCATING_RESOURCES...",
    "PARSING_DOM_STRUCTURE...",
    "COMPILING_STYLESHEETS...",
    "OPTIMIZING_ASSETS...",
    "VERIFYING_INTEGRITY...",
    "SYNCING_STATE...",
    "FINALIZING_BUILD..."
];

export default function LoadingOverlay({ message = "PROCESSING", subMessage }: LoadingOverlayProps) {
    const [currentSubMessage, setCurrentSubMessage] = useState(subMessage || DEFAULT_MESSAGES[0]);
    const textRef = useRef<HTMLSpanElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Message Rotation Logic
    useEffect(() => {
        if (subMessage) {
            setCurrentSubMessage(subMessage);
            return;
        }
        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % DEFAULT_MESSAGES.length;
            setCurrentSubMessage(DEFAULT_MESSAGES[index]);
        }, 1500); // Slower to allow animation
        return () => clearInterval(interval);
    }, [subMessage]);

    // Text Animation Effect
    useEffect(() => {
        if (!textRef.current) return;

        // Reset opacity for stagger
        const letters = textRef.current.querySelectorAll('.letter');

        animate(letters, {
            opacity: [0, 1],
            translateY: [5, 0],
            duration: 300,
            delay: stagger(30),
            easing: 'easeOutQuad'
        });

    }, [currentSubMessage]);

    // Initial Entry Animation
    useAnime<HTMLDivElement>({
        opacity: [0, 1],
        scale: [0.95, 1],
        duration: 400,
        easing: 'easeOutExpo'
    }, []);

    // Infinite Progress Bar
    const { ref: barRef } = useAnime<HTMLDivElement>({
        translateX: ['-100%', '100%'],
        duration: 1500,
        easing: 'linear',
        loop: true
    }, []);

    // Split text for animation
    const renderAnimatedText = (text: string) => {
        return text.split('').map((char, i) => (
            <span key={i} className="letter inline-block whitespace-pre">{char}</span>
        ));
    };

    return (
        <div ref={containerRef} className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-sm border-2 border-[var(--text-main)] bg-black p-6 shadow-[8px_8px_0px_0px_var(--accent-primary)]">
                <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center border-b-2 border-[var(--text-main)] pb-3">
                        <span className="text-[var(--text-main)] font-mono text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-[var(--accent-primary)] animate-pulse" />
                            STATUS
                        </span>
                        <span className="text-[var(--text-main)] font-mono text-xs uppercase tracking-widest">{message}</span>
                    </div>

                    <div className="font-mono text-[var(--accent-primary)] text-sm flex flex-col gap-2">
                        <div className="flex items-center gap-2 h-6">
                            <span className="text-[var(--text-main)]">&gt;</span>
                            <span ref={textRef} className="uppercase flex relative overflow-hidden">
                                {renderAnimatedText(currentSubMessage)}
                            </span>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="h-1 w-full bg-[var(--border-dim)] mt-2 overflow-hidden relative">
                            {/* Animated Bar */}
                            <div ref={barRef} className="absolute inset-y-0 left-0 w-full bg-[var(--text-main)] origin-left" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
