import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAnime } from '../hooks/useAnime';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = false
}: ConfirmationModalProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        if (isOpen) setIsMounted(true);
    }, [isOpen]);

    const { ref: modalRef } = useAnime<HTMLDivElement>({
        opacity: isOpen ? [0, 1] : [1, 0],
        scale: isOpen ? [0.95, 1] : [1, 0.95],
        duration: 200,
        easing: 'easeOutQuad',
        onComplete: () => {
            if (!isOpen) setIsMounted(false);
        }
    }, [isOpen]);

    if (!isOpen && !isMounted) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-200" style={{ opacity: isOpen ? 1 : 0 }}>
            <div
                ref={modalRef}
                className="bg-[var(--bg-card)] border-2 border-[var(--text-main)] w-full max-w-md brutalist-shadow origin-center"
            >
                <div className="flex justify-between items-center p-4 border-b-2 border-[var(--text-main)] bg-[var(--bg-surface)]">
                    <div className="flex items-center gap-2 text-[var(--text-main)] font-mono font-bold tracking-tight">
                        {isDestructive && <AlertTriangle size={16} className="text-[var(--accent-error)]" />}
                        {title.toUpperCase()}
                    </div>
                    <button onClick={onClose} className="text-[var(--text-main)] hover:bg-[var(--text-main)] hover:text-[var(--bg-root)] transition-colors p-1">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-[var(--text-main)] font-mono text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="flex justify-end gap-4 p-4 border-t-2 border-[var(--text-main)] bg-[var(--bg-root)]">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-xs font-mono font-bold border-2 border-[var(--text-main)] text-[var(--text-main)] hover:bg-[var(--text-main)] hover:text-[var(--bg-root)] transition-all uppercase"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-6 py-2 text-xs font-mono font-bold border-2 border-[var(--text-main)] transition-all uppercase shadow-[2px_2px_0px_0px_var(--accent-primary)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${isDestructive ? 'bg-[var(--accent-error)] text-white' : 'bg-[var(--accent-primary)] text-black'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
