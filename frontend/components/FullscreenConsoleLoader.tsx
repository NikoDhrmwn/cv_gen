import React, { useState, useEffect, useRef } from 'react';
import { animate } from 'animejs';

interface FullscreenConsoleLoaderProps {
    isReady: boolean;
    onComplete: () => void;
    error?: string | null;
    initialRect?: { top: number; left: number; width: number; height: number } | null;
}

const SEQUENCE_LOGS = [
    { text: "INITIALIZING AGENT SWARM...", delay: 800 },
    { text: "ESTABLISHING SECURE CONNECTION...", delay: 1600 },
    { text: "ACCESSING TEMPLATE DATABASE...", delay: 2400 },
    { text: "ANALYZING ROLE REQUIREMENTS...", delay: 3500 },
    { text: "FILTERING CANDIDATES...", delay: 4200 },
];

export function FullscreenConsoleLoader({ isReady, onComplete, error, initialRect }: FullscreenConsoleLoaderProps) {
    const [logs, setLogs] = useState<string[]>([]);
    const [isExiting, setIsExiting] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const successTriggered = useRef(false);



    // UseEffect for Morph Animation
    useEffect(() => {
        if (!containerRef.current) return;

        // 1. Fallback: If no initialRect, simply fade in
        if (!initialRect) {
            try {
                animate(containerRef.current, {
                    opacity: [0, 1],
                    scale: [0.9, 1],
                    duration: 500,
                    easing: 'easeOutExpo'
                });
            } catch (e) {
                console.error("Animation error:", e);
            }
            return;
        }

        // 2. Morph: Set Initial positions matching the input box
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Target dimensions (4:3, max 90vw)
        const targetWidth = Math.min(800, viewportWidth * 0.9);
        const targetHeight = Math.min(600, viewportHeight * 0.8); // 4:3-ish

        // Center position
        const targetTop = (viewportHeight - targetHeight) / 2;
        const targetLeft = (viewportWidth - targetWidth) / 2;

        try {
            animate(containerRef.current, {
                top: [initialRect.top, targetTop],
                left: [initialRect.left, targetLeft],
                width: [initialRect.width, targetWidth],
                height: [initialRect.height, targetHeight],
                opacity: [1, 1], // Ensure visible
                easing: 'cubicBezier(0.25, 1, 0.5, 1)', // "Apple-like" ease
                duration: 700,
            });
        } catch (e) {
            console.error("Morph animation error:", e);
        }

        // Animate backdrop separately?
        // We can have a backdrop div behind this one.

    }, [initialRect]);


    // AUTO SCROLL
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    // RE-IMPLEMENTING SEQUENCE LOGIC SAFELY
    useEffect(() => {
        if (error) return;

        let timer: NodeJS.Timeout;
        let index = 0;

        const playNext = () => {
            // Allow sequence to run fully
            if (index >= SEQUENCE_LOGS.length) {
                // Sequence done
                return;
            }

            const step = SEQUENCE_LOGS[index];
            const prevDelay = index > 0 ? SEQUENCE_LOGS[index - 1].delay : 0;
            const actualDelay = step.delay - prevDelay;

            timer = setTimeout(() => {
                const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                // Use functional state to append correctly
                setLogs(prev => {
                    if (prev.some(l => l.includes(step.text))) return prev;
                    return [...prev, `[${timestamp}] ${step.text}`];
                });
                index++;
                playNext();
            }, actualDelay);
        };

        // Add a small delay before starting logs to allow morph to start
        setTimeout(playNext, 300);

        return () => clearTimeout(timer);
    }, [error]);


    // SUCCESS / READY LOGIC
    useEffect(() => {
        // Check if initial sequence is done (logs length >= SEQUENCE_LOGS.length)
        const sequenceDone = logs.length >= SEQUENCE_LOGS.length;

        if (isReady && sequenceDone && !successTriggered.current && !error) {
            successTriggered.current = true;
            const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

            setLogs(prev => [...prev, `[${timestamp}] TEMPLATES FOUND. PREPARING PREVIEW...`]);
            setIsExiting(true);
        }
    }, [isReady, logs.length, error]);

    // EXIT LOGIC
    useEffect(() => {
        if (isExiting) {
            const timer = setTimeout(() => {
                if (containerRef.current) {
                    try {
                        animate(containerRef.current, {
                            opacity: 0,
                            scale: 1.1,
                            duration: 500,
                            easing: 'easeOutQuad',
                        });
                    } catch (e) { }

                    // Force complete even if animation fails
                    setTimeout(onComplete, 500);
                } else {
                    onComplete();
                }
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [isExiting, onComplete]);

    // LONG WAITING LOGIC
    useEffect(() => {
        const sequenceDone = logs.length >= SEQUENCE_LOGS.length;

        if (sequenceDone && !isReady && !error && !successTriggered.current) {
            const timer = setInterval(() => {
                const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                setLogs(prev => [...prev, `[${timestamp}] SEARCHING...`]);
            }, 3000);
            return () => clearInterval(timer);
        }
    }, [logs.length, isReady, error]);


    // ERROR LOGIC
    useEffect(() => {
        if (error) {
            const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setLogs(prev => [...prev, `[${timestamp}] ERROR: ${error}`]);
            setLogs(prev => [...prev, `[${timestamp}] TERMINATING SESSION...`]);

            const timer = setTimeout(() => {
                if (containerRef.current) {
                    animate(containerRef.current, {
                        opacity: 0,
                        duration: 300,
                    });
                    setTimeout(onComplete, 300);
                }
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [error, onComplete]);

    return (
        <>
            {/* BACKDROP */}
            <div className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] transition-opacity duration-500 ${isExiting ? 'opacity-0' : 'opacity-100'}`} />

            {/* TERMINAL WINDOW */}
            <div
                ref={containerRef}
                className="fixed z-[100] bg-black border border-[var(--text-main)] flex flex-col uppercase overflow-hidden shadow-[8px_8px_0_0_#46c556]"
                style={initialRect ? {
                    top: initialRect.top,
                    left: initialRect.left,
                    width: initialRect.width,
                    height: initialRect.height,
                } : {
                    top: '50%',
                    left: '50%',
                    width: '800px',
                    height: '600px',
                    transform: 'translate(-50%, -50%)'
                }}
            >
                {/* HEADER */}
                <div className="flex justify-between border-b border-[var(--border-dim)] p-4 bg-white/5">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full box-content border-2 border-transparent shadow-[0_0_10px_currentColor] animate-pulse ${error ? 'bg-red-500 text-red-500' : 'bg-green-500 text-green-500'}`} />
                        <span className="text-white font-bold tracking-widest text-sm">AGENT_STATUS: {error ? 'CRITICAL_FAILURE' : 'ACTIVE'}</span>
                    </div>
                    <div className="text-white/50 text-xs tracking-widest">SECURE_CHANNEL_V2</div>
                </div>

                {/* MAIN LOG WINDOW */}
                <div className="flex-1 relative flex flex-col justify-end w-full p-8 font-mono">
                    <div ref={scrollRef} className="flex flex-col gap-2 overflow-y-auto pr-2">
                        {logs.map((log, i) => {
                            const isError = log.includes('ERROR') || log.includes('TERMINATING');
                            const isSuccess = log.includes('TEMPLATES FOUND');
                            return (
                                <div
                                    key={i}
                                    className={`text-lg tracking-wide border-l-2 pl-4 py-0.5 font-bold ${isError ? 'text-red-500 border-red-500' :
                                        isSuccess ? 'text-green-400 border-green-400' :
                                            'text-white/80 border-transparent'
                                        }`}
                                >
                                    <span className="opacity-40 mr-4 text-xs font-normal text-white/50 align-middle">{log.split(']')[0]}]</span>
                                    {log.split(']')[1]}
                                </div>
                            );
                        })}

                        {/* Active typing line / Cursor */}
                        {!error && !isExiting && (
                            <div className="flex items-center gap-2 mt-2 text-white/50 opacity-50">
                                <span>&gt;</span>
                                <div className="w-2 h-5 bg-white/50 animate-pulse" />
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="border-t border-[var(--border-dim)] p-4 flex justify-between text-xs text-white/30 bg-white/5">
                    <div>LATENCY: 12ms</div>
                    <div>REG: US-EAST-1</div>
                </div>
            </div>
        </>
    );
}
