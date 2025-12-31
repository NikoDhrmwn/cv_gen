import React, { useState, useEffect } from 'react';

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

    useEffect(() => {
        if (subMessage) {
            setCurrentSubMessage(subMessage);
            return;
        }

        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % DEFAULT_MESSAGES.length;
            setCurrentSubMessage(DEFAULT_MESSAGES[index]);
        }, 800);

        return () => clearInterval(interval);
    }, [subMessage]);

    return (
        <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-sm border-2 border-[var(--text-main)] bg-black p-6 shadow-[8px_8px_0px_0px_var(--accent-primary)] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center border-b-2 border-[var(--text-main)] pb-3">
                        <span className="text-[var(--text-main)] font-mono text-sm font-bold uppercase tracking-widest">STATUS</span>
                        <span className="text-[var(--text-main)] font-mono text-xs uppercase tracking-widest animate-pulse">{message}</span>
                    </div>

                    <div className="font-mono text-[var(--accent-primary)] text-sm flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[var(--text-main)]">&gt;</span>
                            <span className="uppercase">{currentSubMessage}</span>
                            <span className="w-2.5 h-5 bg-[var(--accent-primary)] animate-pulse" />
                        </div>
                        <div className="h-1 w-full bg-[var(--border-dim)] mt-2 overflow-hidden">
                            <div className="h-full bg-[var(--text-main)] animate-[loading_2s_ease-in-out_infinite]" style={{ width: '50%' }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
