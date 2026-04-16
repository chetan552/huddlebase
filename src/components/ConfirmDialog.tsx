'use client';

import { useEffect, useRef, useState } from 'react';

interface ConfirmDialogProps {
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'danger' | 'default';
    onConfirm: () => Promise<void>;
    onClose: () => void;
}

// Render this component conditionally from the parent (e.g. {condition && <ConfirmDialog .../>}).
// Unmounting on close resets internal state naturally — no need for an open prop.
export default function ConfirmDialog({
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'default',
    onConfirm,
    onClose,
}: ConfirmDialogProps) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const titleId = 'confirm-dialog-title';
    const descId = 'confirm-dialog-desc';

    // Focus cancel button on mount; handle Escape to dismiss
    useEffect(() => {
        const frame = requestAnimationFrame(() => cancelRef.current?.focus());
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !submitting) onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener('keydown', handleKey);
        };
    }, [submitting, onClose]);

    const handleConfirm = async () => {
        setSubmitting(true);
        setError(null);
        try {
            await onConfirm();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
            setSubmitting(false);
        }
    };

    return (
        <div
            className="modal-overlay"
            onClick={() => { if (!submitting) onClose(); }}
            aria-hidden="false"
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
                className="modal"
                style={{ maxWidth: '420px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2 id={titleId} className="modal-title">{title}</h2>
                </div>
                <div className="modal-body">
                    <p id={descId} style={{ color: 'var(--text-secondary)', marginBottom: error ? '1rem' : 0 }}>
                        {description}
                    </p>
                    {error && (
                        <p style={{ color: 'var(--danger-400)', fontSize: '0.875rem', marginTop: '0.75rem' }}>
                            {error}
                        </p>
                    )}
                </div>
                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem' }}>
                    <button
                        ref={cancelRef}
                        className="btn btn-ghost"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                        onClick={handleConfirm}
                        disabled={submitting}
                    >
                        {submitting ? '…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
