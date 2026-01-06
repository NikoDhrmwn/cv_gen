import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, X } from 'lucide-react';
import { useAnime } from '../hooks/useAnime';
import { AnimatedButton } from './ui/AnimatedButton';

export interface ChatHistoryItem {
    id: string;
    prompt: string;
    timestamp: Date;
    status: 'success' | 'error' | 'info';
    snapshot: any; // The state BEFORE this edit, so we can revert TO it
}

interface ChatInterfaceProps {
    onSend: (msg: string) => Promise<void>;
    isProcessing: boolean;
    history: ChatHistoryItem[];
    onRevert: (snapshot: any) => void;
    sidebarOpen?: boolean;
}

export default function ChatInterface({ onSend, isProcessing, history = [], onRevert, sidebarOpen = false }: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isWindowMounted, setIsWindowMounted] = useState(false); // For exit animation

    // Auto-resize textarea
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [input]);

    const handleSend = async () => {
        if (!input.trim() || isProcessing) return;
        const msg = input;
        setInput('');
        await onSend(msg);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Animation for Window
    useEffect(() => {
        if (isOpen) setIsWindowMounted(true);
    }, [isOpen]);

    const { ref: windowRef } = useAnime<HTMLDivElement>({
        opacity: isOpen ? [0, 1] : [1, 0],
        scale: isOpen ? [0.9, 1] : [1, 0.9],
        translateY: isOpen ? [10, 0] : [0, 10],
        duration: 200,
        easing: 'linear',
        onComplete: () => {
            if (!isOpen) setIsWindowMounted(false);
        }
    }, [isOpen]);

    // Animation for Button (Using useAnime manually since we conditionally render it and want an exit)
    // Actually, distinct mount states are cleaner.
    // If isOpen is true -> Button unmounts? Or just hides.
    // Let's keep existing behavior: Button unmounts when Open is true.
    // But we want it to animate out.
    // For simplicity, we'll swap them immediately or use a shared container.
    // The previous code used AnimatePresence to cross-fade.
    // We can just keep the button mounted but hidden/opacity 0 if we want smooth transition, but direct swap is robust.

    return (
        <div className={`fixed bottom-6 z-50 flex flex-col items-end gap-4 pointer-events-auto transition-all duration-300 ${sidebarOpen ? 'right-96' : 'right-8'}`} >

            {/* Chat Window */}
            {(isOpen || isWindowMounted) && (
                <div
                    ref={windowRef}
                    className="bg-[var(--bg-surface)] border-2 border-[var(--text-main)] brutalist-shadow p-0 w-[380px] flex flex-col origin-bottom-right"
                    style={{ display: isWindowMounted ? 'flex' : 'none' }} // Prevent layout thrashing if needed, but 'isWindowMounted' handles DOM
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b-2 border-[var(--text-main)] p-3 bg-[var(--text-main)]">
                        <div className="flex items-center gap-2 text-[var(--bg-root)] font-bold font-mono text-sm tracking-tight uppercase">
                            <Sparkles size={14} className="text-[var(--bg-root)]" />
                            AI_EDITOR_AGENT_V1
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-[var(--bg-root)] hover:text-white transition-colors">
                            <X size={16} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="bg-[var(--bg-root)] p-4 text-xs text-[var(--text-muted)] leading-relaxed max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                        {history.length === 0 ? (
                            <div className="text-center py-6 opacity-50 font-mono">
                                <p>&gt; READY FOR INSTRUCTIONS</p>
                                <p className="mt-2 text-[10px] opacity-70">"Make my summary more punchy"</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {history.map((item) => (
                                    <div key={item.id} className="group flex flex-col gap-1 border-l-2 border-[var(--border-dim)] pl-3">
                                        <div className="flex justify-between items-start">
                                            <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase">[{item.timestamp.toLocaleTimeString()}]</span>
                                            <button
                                                onClick={() => onRevert(item.snapshot)}
                                                className="text-[10px] text-[var(--accent-error)] hover:bg-[var(--accent-error)] hover:text-white px-1 transition-all opacity-0 group-hover:opacity-100 font-mono"
                                            >
                                                [REVERT]
                                            </button>
                                        </div>
                                        <p className="text-[var(--text-main)] font-mono text-xs">{item.prompt}</p>
                                        {item.status === 'error' && <span className="text-[var(--accent-error)] text-[10px] font-mono">&gt; FAILED</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-[var(--bg-surface)] border-t-2 border-[var(--text-main)]">
                        <div className="relative flex items-end gap-2 bg-[var(--bg-root)] border-2 border-[var(--border-dim)] focus-within:border-[var(--text-main)] transition-colors p-2">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="> Enter command..."
                                className="w-full bg-transparent border-none outline-none resize-none text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] font-mono max-h-32 py-1 custom-scrollbar"
                                rows={1}
                                disabled={isProcessing}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isProcessing}
                                className="p-2 bg-[var(--text-main)] text-[var(--bg-root)] hover:bg-[var(--accent-primary)] disabled:opacity-50 transition-colors border border-transparent"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <div className="w-4 h-4 bg-[var(--bg-root)] rotate-45 transform origin-center translate-y-[2px]" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            {!isOpen && (
                <AnimatedButton
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 px-6 py-4 bg-[var(--text-main)] text-[var(--bg-root)] font-bold shadow-none hover:shadow-[6px_6px_0px_0px_var(--accent-primary)] hover:-translate-y-1 transition-all duration-200 border-2 border-[var(--text-main)]"
                >
                    <Sparkles size={18} strokeWidth={2.5} />
                    <span className="text-sm font-mono tracking-wider">AI_EDIT</span>
                </AnimatedButton>
            )}
        </div>
    );
}
