'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { upload } from '@vercel/blob/client';
import { timeAgo } from '@/lib/utils';
import { Folder, FolderPlus, Upload, FileText, Trash2, X, Lock, Download, ChevronLeft } from 'lucide-react';

interface TeamFile {
    id: string;
    name: string;
    description: string | null;
    url: string;
    mimeType: string | null;
    sizeBytes: number | null;
    staffOnly: boolean;
    downloadCount: number;
    folderId: string | null;
    folderName: string | null;
    uploaderName: string;
    createdAt: string;
    canDelete: boolean;
}

interface FileFolder {
    id: string;
    name: string;
    fileCount: number;
}

interface Team { id: string; name: string }

const ACCEPT = [
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
].join(',');

function formatSize(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamId, setTeamId] = useState('');
    const [files, setFiles] = useState<TeamFile[]>([]);
    const [folders, setFolders] = useState<FileFolder[]>([]);
    const [activeFolder, setActiveFolder] = useState<FileFolder | null>(null);
    const [canUpload, setCanUpload] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [error, setError] = useState('');
    const [staffOnlyUpload, setStaffOnlyUpload] = useState(false);
    const [showFolderForm, setShowFolderForm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/teams');
                const data = await res.json();
                if (data.success && data.data.length > 0) {
                    setTeams(data.data);
                    setTeamId(data.data[0].id);
                }
            } catch { /* empty state covers it */ }
            setLoading(false);
        })();
    }, []);

    const load = useCallback(async () => {
        if (!teamId) return;
        try {
            const query = activeFolder ? `&folderId=${activeFolder.id}` : '';
            const res = await fetch(`/api/files?teamId=${teamId}${query}`);
            const data = await res.json();
            if (data.success) {
                setFiles(data.data.files);
                setFolders(data.data.folders);
                setCanUpload(data.data.canUpload);
            }
        } catch { /* empty state covers it */ }
    }, [teamId, activeFolder]);

    useEffect(() => { load(); }, [load]);

    const handleFiles = async (selected: FileList | null) => {
        if (!selected || selected.length === 0 || !teamId) return;
        setUploading(true);
        setError('');
        setProgress({ done: 0, total: selected.length });

        for (let i = 0; i < selected.length; i += 1) {
            const file = selected[i];
            try {
                const blob = await upload(file.name, file, {
                    access: 'public',
                    handleUploadUrl: '/api/files/upload',
                    clientPayload: JSON.stringify({
                        teamId,
                        folderId: activeFolder?.id ?? null,
                        staffOnly: staffOnlyUpload,
                        name: file.name,
                    }),
                });

                // Storage can't call back to localhost, so record the row directly in dev.
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    await fetch('/api/files', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            teamId,
                            folderId: activeFolder?.id ?? null,
                            name: file.name,
                            url: blob.url,
                            mimeType: file.type,
                            sizeBytes: file.size,
                            staffOnly: staffOnlyUpload,
                            notify: i === 0 && !staffOnlyUpload,
                        }),
                    });
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Upload failed';
                setError(
                    message.includes('not configured')
                        ? 'File storage is not set up yet. Add a Vercel Blob store and set BLOB_READ_WRITE_TOKEN.'
                        : `${file.name}: ${message}`,
                );
            }
            setProgress({ done: i + 1, total: selected.length });
        }

        setUploading(false);
        setProgress({ done: 0, total: 0 });
        if (fileInputRef.current) fileInputRef.current.value = '';
        load();
    };

    const openFile = async (file: TeamFile) => {
        // Route through the API so downloads are counted, then open the storage URL.
        try {
            const res = await fetch(`/api/files/${file.id}`, { method: 'POST' });
            const data = await res.json();
            window.open(data.success ? data.data.url : file.url, '_blank', 'noopener');
        } catch {
            window.open(file.url, '_blank', 'noopener');
        }
    };

    const remove = async (file: TeamFile) => {
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
        try {
            await fetch(`/api/files/${file.id}`, { method: 'DELETE' });
            load();
        } catch { load(); }
    };

    if (loading) {
        return <div className="page-content"><div className="card"><div className="skeleton" style={{ height: 120 }} /></div></div>;
    }

    if (teams.length === 0) {
        return (
            <div className="page-content">
                <div className="empty-state">
                    <div className="empty-state__icon"><Folder /></div>
                    <h3 className="empty-state__title">No teams yet</h3>
                    <p className="empty-state__description">Join or create a team to share documents.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{activeFolder ? activeFolder.name : 'Team files'}</h1>
                    <p className="page-subtitle">
                        {activeFolder
                            ? `${activeFolder.fileCount} file${activeFolder.fileCount === 1 ? '' : 's'}`
                            : 'Waivers, playbooks, league rules and forms in one place.'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {activeFolder ? (
                        <button className="btn btn-ghost" onClick={() => setActiveFolder(null)}>
                            <ChevronLeft size={16} /> All files
                        </button>
                    ) : (
                        <>
                            {teams.length > 1 && (
                                <select className="form-select" value={teamId} onChange={(e) => setTeamId(e.target.value)} style={{ width: 'auto' }}>
                                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            )}
                            {canUpload && (
                                <button className="btn btn-ghost" onClick={() => setShowFolderForm(true)}>
                                    <FolderPlus size={16} /> New folder
                                </button>
                            )}
                        </>
                    )}
                    {canUpload && (
                        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                            <Upload size={16} /> {uploading ? `Uploading ${progress.done}/${progress.total}…` : 'Upload'}
                        </button>
                    )}
                </div>
            </div>

            <input ref={fileInputRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => handleFiles(e.target.files)} />

            {error && (
                <div className="form-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <span>{error}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setError('')} aria-label="Dismiss"><X size={14} /></button>
                </div>
            )}

            {canUpload && !activeFolder && (
                <label style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem',
                    fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer',
                }}>
                    <input type="checkbox" checked={staffOnlyUpload} onChange={(e) => setStaffOnlyUpload(e.target.checked)} />
                    <Lock size={13} /> Upload as staff-only (hidden from players and parents)
                </label>
            )}

            {!activeFolder && folders.length > 0 && (
                <div className="card" style={{ marginBottom: '1.25rem' }}>
                    <div className="card-header"><h2 className="card-title">Folders</h2></div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.65rem' }}>
                        {folders.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setActiveFolder(f)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                                    background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.1)',
                                    color: 'var(--text-primary)',
                                }}
                            >
                                <Folder size={18} color="var(--primary-400)" />
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{f.fileCount} file{f.fileCount === 1 ? '' : 's'}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {files.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state__icon"><FileText /></div>
                    <h3 className="empty-state__title">No files yet</h3>
                    <p className="empty-state__description">
                        {canUpload
                            ? 'Upload waivers, playbooks or league rules so the whole team can find them.'
                            : 'Your coach has not shared any files yet.'}
                    </p>
                </div>
            ) : (
                <div className="card">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {files.map((f) => (
                            <div key={f.id} style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.75rem',
                                borderRadius: 'var(--radius-md)', background: 'rgba(148,163,184,0.05)',
                                border: '1px solid rgba(148,163,184,0.08)',
                            }}>
                                <FileText size={18} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                                        {f.staffOnly && (
                                            <span title="Staff only" style={{ display: 'inline-flex', flexShrink: 0 }}>
                                                <Lock size={12} color="var(--warning-400)" />
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                        {f.uploaderName} · {timeAgo(f.createdAt)}
                                        {f.sizeBytes ? ` · ${formatSize(f.sizeBytes)}` : ''}
                                        {f.folderName && !activeFolder ? ` · ${f.folderName}` : ''}
                                        {f.downloadCount > 0 ? ` · ${f.downloadCount} download${f.downloadCount === 1 ? '' : 's'}` : ''}
                                    </div>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => openFile(f)} aria-label={`Open ${f.name}`}>
                                    <Download size={15} />
                                </button>
                                {f.canDelete && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => remove(f)} aria-label={`Delete ${f.name}`}>
                                        <Trash2 size={15} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showFolderForm && (
                <FolderForm
                    teamId={teamId}
                    onClose={() => setShowFolderForm(false)}
                    onCreated={() => { setShowFolderForm(false); load(); }}
                />
            )}
        </div>
    );
}

function FolderForm({ teamId, onClose, onCreated }: { teamId: string; onClose: () => void; onCreated: () => void }) {
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/files/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId, name }),
            });
            const data = await res.json();
            if (data.success) onCreated();
            else setError(data.error || 'Could not create that folder.');
        } catch {
            setError('Something went wrong. Try again.');
        }
        setBusy(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ maxWidth: 400 }}>
                <div className="modal-header">
                    <h3 className="modal-title">New folder</h3>
                    <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close"><X size={16} /></button>
                </div>
                <div className="modal-body">
                    {error && <div className="form-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}
                    <div className="form-group">
                        <label className="form-label">Name</label>
                        <input className="form-input" required placeholder="e.g. Waivers" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
                        {busy ? 'Creating…' : 'Create folder'}
                    </button>
                </div>
            </form>
        </div>
    );
}
