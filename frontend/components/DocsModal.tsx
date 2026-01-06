import React, { useState, useEffect } from 'react';
import { X, BookOpen, Terminal, ChevronRight } from 'lucide-react';
import { useAnime } from '../hooks/useAnime';

interface DocsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DocsModal({ isOpen, onClose }: DocsModalProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        if (isOpen) setIsMounted(true);
    }, [isOpen]);

    const { ref: modalRef } = useAnime<HTMLDivElement>({
        opacity: isOpen ? [0, 1] : [1, 0],
        scale: isOpen ? [0.95, 1] : [1, 0.95],
        translateY: isOpen ? [10, 0] : [0, 10],
        duration: 300,
        easing: 'easeOutExpo',
        onComplete: () => {
            if (!isOpen) setIsMounted(false);
        }
    }, [isOpen]);

    if (!isOpen && !isMounted) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div
                ref={modalRef}
                className="w-full max-w-2xl bg-[var(--bg-root)] border-2 border-[var(--text-main)] shadow-[8px_8px_0px_0px_var(--accent-primary)] flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b-2 border-[var(--text-main)] bg-[var(--bg-surface)]">
                    <div className="flex items-center gap-2 font-mono font-bold uppercase tracking-tight text-lg">
                        <BookOpen size={20} />
                        SYSTEM_DOCUMENTATION
                    </div>
                    <button onClick={onClose} className="hover:text-[var(--accent-error)] transition-colors">
                        <X size={24} strokeWidth={3} />
                    </button>
                </div>

                {/* Content */}
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-8 custom-scrollbar bg-[var(--bg-root)]">

                    {/* Intro */}
                    <section>
                        <h3 className="font-bold flex items-center gap-2 text-lg mb-3 text-[var(--text-main)] uppercase border-b-2 border-[var(--text-main)] pb-2 tracking-wider">
                            <Terminal size={18} /> About
                        </h3>
                        <p className="mb-2 text-[var(--text-main)] leading-relaxed">
                            This tool uses AI to turn any image or design into a fully functional Resume/CV editor.
                            Simply pick a template you like, and our agents will build the form and layout for you instantly.
                        </p>
                    </section>

                    {/* Workflow */}
                    <section>
                        <h3 className="font-bold flex items-center gap-2 text-lg mb-3 text-[var(--text-main)] uppercase border-b-2 border-[var(--text-main)] pb-2 tracking-wider">
                            <ChevronRight size={18} /> How It Works
                        </h3>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <span className="font-bold text-[var(--accent-primary)]">1.</span>
                                <div>
                                    <strong className="block uppercase text-xs mb-1">Pick a Design</strong>
                                    <p className="opacity-80">Search for a role (e.g., "Software Engineer") to find templates, or upload your own.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <span className="font-bold text-[var(--accent-primary)]">2.</span>
                                <div>
                                    <strong className="block uppercase text-xs mb-1">AI Generates the Editor</strong>
                                    <p className="opacity-80">The AI analyzes the image, extracts the structure, and creates a form for you to fill out.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <span className="font-bold text-[var(--accent-primary)]">3.</span>
                                <div>
                                    <strong className="block uppercase text-xs mb-1">Edit & Export</strong>
                                    <p className="opacity-80">Fill in your details, import an old CV to auto-fill, or use the AI Chat to polish your text. Then export to PDF.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Features via Tips */}
                    <section>
                        <h3 className="font-bold flex items-center gap-2 text-lg mb-3 text-[var(--text-main)] uppercase border-b-2 border-[var(--text-main)] pb-2 tracking-wider">
                            <BookOpen size={18} /> Features
                        </h3>

                        <div className="grid gap-6">
                            <div className="bg-[var(--bg-surface)] p-4 border border-[var(--border-dim)]">
                                <h4 className="font-bold text-[var(--text-main)] uppercase mb-2 text-xs flex items-center gap-2">
                                    <span className="w-2 h-2 bg-[var(--accent-primary)]"></span>
                                    Import Your CV
                                </h4>
                                <p className="opacity-80 mb-2">
                                    Don't want to type everything? Click <strong className="border border-[var(--text-main)] px-1 text-[10px] uppercase">IMPORT_CV</strong> in the toolbar to upload your existing PDF/TXT/MD resume. The AI will fill the fields for you.
                                </p>
                            </div>

                            <div className="bg-[var(--bg-surface)] p-4 border border-[var(--border-dim)]">
                                <h4 className="font-bold text-[var(--text-main)] uppercase mb-2 text-xs flex items-center gap-2">
                                    <span className="w-2 h-2 bg-[var(--accent-primary)]"></span>
                                    AI Co-Pilot
                                </h4>
                                <p className="opacity-80 mb-2">
                                    Use the chat on the right to help you write better content. You can ask it to:
                                </p>
                                <div className="space-y-2 text-xs font-mono bg-[var(--bg-root)] p-3 border border-[var(--border-dim)]">
                                    <p className="text-[var(--text-muted)]">- "Rewrite my summary to be more professional."</p>
                                    <p className="text-[var(--text-muted)]">- "Fix my spelling mistakes."</p>
                                    <p className="text-[var(--text-muted)]">- "Suggest skills for a frontend developer."</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Shortcuts */}
                    <div className="p-4 bg-[var(--text-main)] text-[var(--bg-root)] text-xs font-mono">
                        <p className="font-bold mb-2 uppercase tracking-widest border-b border-[var(--bg-root)] pb-1 inline-block">Shortcuts</p>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <div className="flex justify-between"><span>Undo</span> <span>CTRL+Z</span></div>
                            <div className="flex justify-between"><span>Redo</span> <span>CTRL+Y</span></div>
                            <div className="flex justify-between"><span>Send Message</span> <span>ENTER</span></div>
                            <div className="flex justify-between"><span>Close Docs</span> <span>ESC</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
