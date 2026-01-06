import React, { useEffect, useRef } from 'react';
import { animate } from 'animejs';

interface CinematicBuildLoaderProps {
    status: 'analyzing' | 'success' | 'error';
    logs: string[];
    onComplete: () => void;
}

export function CinematicBuildLoader({ status, logs, onComplete }: CinematicBuildLoaderProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    // Entry Animation
    useEffect(() => {
        if (!containerRef.current) return;

        // Pop in effect
        animate(containerRef.current, {
            scale: [0.9, 1],
            opacity: [0, 1],
            duration: 400,
            easing: 'easeOutExpo'
        });
    }, []);

    // Exit Animation Logic
    useEffect(() => {
        if (status === 'success') {
            const timer = setTimeout(() => {
                if (containerRef.current) {
                    // Slide up and fade out
                    animate(containerRef.current, {
                        translateY: -50,
                        opacity: 0,
                        duration: 600,
                        easing: 'easeInExpo',
                        // complete callback handled by timeout for safety
                    });

                    // Trigger parent completion after animation
                    setTimeout(onComplete, 600);
                } else {
                    onComplete();
                }
            }, 1000); // Wait 1s before exiting to show "Success" state if needed

            return () => clearTimeout(timer);
        }
    }, [status, onComplete]);

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-500">
            <div
                ref={containerRef}
                className="w-full max-w-xl bg-black border-2 border-[var(--text-main)] shadow-[8px_8px_0px_0px_var(--accent-primary)] overflow-hidden font-mono text-xs opacity-0"
            >
                {/* Header */}
                <div className="bg-[var(--text-main)] px-4 py-3 flex items-center justify-between text-[var(--bg-root)] border-b border-[var(--text-main)]">
                    <div className="flex items-center gap-2">
                        <span className="animate-spin text-[var(--bg-root)]">✜</span>
                        <span className="font-bold uppercase tracking-widest">System_Build.log</span>
                    </div>
                    <span className="animate-pulse font-bold">{status === 'success' ? 'COMPLETE' : 'RUNNING'}</span>
                </div>

                {/* Logs Area */}
                <div className="p-6 h-80 overflow-y-auto bg-black custom-scrollbar flex flex-col justify-end border-t-2 border-[var(--text-main)]">
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1 break-all flex gap-3">
                            <span className="text-[var(--text-muted)] opacity-50 select-none min-w-[80px] text-right">{log.includes(']') ? log.split(']')[0] + ']' : ''}</span>
                            <span className={log.includes("Error") ? "text-[var(--accent-error)]" : log.includes("success") || status === 'success' ? "text-[var(--accent-primary)]" : "text-[var(--text-main)]"}>
                                {log.includes(']') ? log.split(']')[1] : log}
                            </span>
                        </div>
                    ))}
                    <div className="animate-pulse text-[var(--accent-primary)] mt-2">_</div>
                </div>
            </div>
        </div>
    );
}
