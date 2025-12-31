import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import 'react-quill-new/dist/quill.snow.css';
import '../styles/quill-overrides.css';

// Dynamic import to avoid SSR issues with Quill
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface RichTextModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (value: string) => void;
    initialValue: string;
    label: string;
}

export default function RichTextModal({ isOpen, onClose, onSave, initialValue, label }: RichTextModalProps) {
    const [value, setValue] = useState(initialValue || '');

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue || '');
        }
    }, [isOpen, initialValue]);

    const handleSave = () => {
        onSave(value);
        onClose();
    };

    // Custom toolbar modules
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'clean']
        ],
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "linear" }} // Brutalist snap animation
                        className="relative w-full max-w-2xl bg-[var(--bg-root)] border-2 border-[var(--text-main)] brutalist-shadow z-10 box-border"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-dim)] bg-[var(--bg-card)]">
                            <h3 className="text-lg font-bold font-mono tracking-tight uppercase text-[var(--text-main)]">
                                Edit: <span className="text-[var(--text-muted)]">{label}</span>
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-[var(--bg-root)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Editor Area */}
                        <div className="p-6 bg-[var(--bg-root)] minimal-quill">
                            <ReactQuill
                                theme="snow"
                                value={value}
                                onChange={setValue}
                                modules={modules}
                                className="bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-dim)] min-h-[200px]"
                            />
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-dim)] bg-[var(--bg-card)]">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium hover:underline text-[var(--text-muted)]"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-[var(--bg-root)] bg-[var(--text-main)] hover:opacity-90 transition-opacity"
                            >
                                <Check className="w-4 h-4" />
                                SAVE CHANGES
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
