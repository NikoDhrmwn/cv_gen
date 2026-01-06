import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Check, Trash2, Send } from 'lucide-react';
import { useAnime } from '../hooks/useAnime';

interface Comment {
    id: string;
    text: string;
    resolved: boolean;
    lineNumber?: number;
    section?: string;
}

interface CommentSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    comments: Comment[];
    onResolve: (id: string) => void;
    onDelete: (id: string) => void;
    onAddComment?: (text: string) => void;
}

export default function CommentSidebar({ isOpen, onClose, comments, onResolve, onDelete, onAddComment }: CommentSidebarProps) {
    const [newComment, setNewComment] = useState("");
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        if (isOpen) setIsMounted(true);
    }, [isOpen]);

    const { ref: sidebarRef } = useAnime<HTMLDivElement>({
        translateX: isOpen ? ['100%', '0%'] : ['0%', '100%'],
        opacity: isOpen ? [0, 1] : [1, 0],
        duration: 300,
        easing: 'easeOutQuad',
        onComplete: () => {
            if (!isOpen) setIsMounted(false);
        }
    }, [isOpen]);


    const handleAdd = () => {
        if (!newComment.trim()) return;
        if (onAddComment) onAddComment(newComment);
        setNewComment("");
    };

    if (!isOpen && !isMounted) return null;

    return (
        <div
            ref={sidebarRef}
            className="fixed right-0 top-14 bottom-0 w-80 bg-[var(--bg-surface)] border-l border-[var(--border-dim)] shadow-xl z-50 flex flex-col"
            style={{ transform: 'translateX(100%)' }} // Initial state before animation catches up if needed, though useAnime handles it
        >
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--border-dim)] bg-[var(--bg-root)]">
                <div className="flex items-center gap-2 font-mono text-sm font-bold text-[var(--text-main)]">
                    <MessageSquare className="w-4 h-4" />
                    COMMENTS ({comments.filter(c => !c.resolved).length})
                </div>
                <button onClick={onClose} className="p-2 hover:bg-[var(--bg-card)] rounded text-[var(--text-muted)] hover:text-[var(--text-main)]">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Comment List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.length === 0 ? (
                    <div className="text-center py-10 text-[var(--text-muted)]">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No comments yet.</p>
                        <p className="text-xs opacity-70">Click on the preview to add one.</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div
                            key={comment.id}
                            className={`p-3 rounded border text-sm transition-all duration-300 ${comment.resolved ? 'bg-[var(--bg-root)] border-[var(--border-dim)] opacity-60' : 'bg-[var(--bg-card)] border-[var(--border-mid)]'}`}
                        >
                            <div className="flex justify-between items-start gap-2 mb-2">
                                <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${comment.resolved ? 'bg-[var(--border-dim)] text-[var(--text-muted)]' : 'bg-[var(--accent-primary)] text-[var(--bg-root)]'}`}>
                                    {comment.resolved ? 'RESOLVED' : 'OPEN'}
                                </span>
                                <div className="flex gap-1">
                                    {!comment.resolved && (
                                        <button onClick={() => onResolve(comment.id)} className="p-1 hover:text-[var(--accent-primary)] text-[var(--text-muted)]" title="Mark Resolved">
                                            <Check className="w-3 h-3" />
                                        </button>
                                    )}
                                    <button onClick={() => onDelete(comment.id)} className="p-1 hover:text-[var(--accent-error)] text-[var(--text-muted)]" title="Delete">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-[var(--text-main)] mb-1">{comment.text}</p>
                            {comment.section && (
                                <div className="text-[10px] text-[var(--text-muted)] font-mono mt-2 pt-2 border-t border-[var(--border-dim)] flex justify-between">
                                    <span>Context: {comment.section}</span>
                                    {comment.lineNumber && <span>L{comment.lineNumber}</span>}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Input Area (General Comment) */}
            <div className="p-4 border-t border-[var(--border-dim)] bg-[var(--bg-root)]">
                <div className="flex gap-2">
                    <input
                        className="flex-1 bg-[var(--bg-card)] border border-[var(--border-dim)] rounded px-3 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:border-[var(--text-main)]"
                        placeholder="Add general comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newComment.trim()}
                        className="p-2 bg-[var(--text-main)] text-[var(--bg-root)] rounded hover:opacity-90 disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
