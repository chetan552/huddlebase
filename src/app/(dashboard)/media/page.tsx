'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { upload } from '@vercel/blob/client';
import { getAvatarColor, getInitials, timeAgo } from '@/lib/utils';
import { Image as ImageIcon, Upload, Plus, X, Trash2, Play, FolderPlus, ChevronLeft } from 'lucide-react';

interface MediaItem {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    type: 'IMAGE' | 'VIDEO';
    caption: string | null;
    uploaderId: string;
    uploaderName: string;
    createdAt: string;
    canDelete: boolean;
}

interface Album {
    id: string;
    name: string;
    description: string | null;
    coverUrl: string | null;
    itemCount: number;
    createdByName: string;
    createdAt: string;
}

interface Team { id: string; name: string }

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/heic,video/mp4,video/quicktime,video/webm';

export default function MediaPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamId, setTeamId] = useState<string>('');
    const [albums, setAlbums] = useState<Album[]>([]);
    const [items, setItems] = useState<MediaItem[]>([]);
    const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [error, setError] = useState('');
    const [lightbox, setLightbox] = useState<MediaItem | null>(null);
    const [showAlbumForm, setShowAlbumForm] = useState(false);
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
            const albumQuery = activeAlbum ? `&albumId=${activeAlbum.id}` : '';
            const [albumsRes, itemsRes] = await Promise.all([
                fetch(`/api/media/albums?teamId=${teamId}`),
                fetch(`/api/media?teamId=${teamId}${albumQuery}`),
            ]);
            const albumsData = await albumsRes.json();
            const itemsData = await itemsRes.json();
            if (albumsData.success) setAlbums(albumsData.data);
            if (itemsData.success) setItems(itemsData.data);
        } catch { /* empty state covers it */ }
    }, [teamId, activeAlbum]);

    useEffect(() => { load(); }, [load]);

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0 || !teamId) return;
        setUploading(true);
        setError('');
        setProgress({ done: 0, total: files.length });

        let succeeded = 0;
        for (let i = 0; i < files.length; i += 1) {
            const file = files[i];
            try {
                // Upload straight to blob storage — serverless bodies cap at 4.5MB,
                // which no team video clears.
                const blob = await upload(file.name, file, {
                    access: 'public',
                    handleUploadUrl: '/api/media/upload',
                    clientPayload: JSON.stringify({ teamId, albumId: activeAlbum?.id ?? null }),
                });

                // In development the storage callback can't reach localhost, so record
                // the row directly. Duplicate rows aren't possible because the callback
                // only fires on deployed environments.
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    await fetch('/api/media', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            teamId,
                            albumId: activeAlbum?.id ?? null,
                            url: blob.url,
                            contentType: file.type,
                            sizeBytes: file.size,
                        }),
                    });
                }
                succeeded += 1;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Upload failed';
                setError(
                    message.includes('not configured')
                        ? 'Media storage is not set up yet. Add a Vercel Blob store and set BLOB_READ_WRITE_TOKEN.'
                        : `${file.name}: ${message}`,
                );
            }
            setProgress({ done: i + 1, total: files.length });
        }

        // One notification for the whole batch rather than one per photo.
        if (succeeded > 0) {
            try {
                await fetch('/api/media/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ teamId, count: succeeded, albumId: activeAlbum?.id ?? null }),
                });
            } catch { /* notification is best-effort */ }
        }

        setUploading(false);
        setProgress({ done: 0, total: 0 });
        if (fileInputRef.current) fileInputRef.current.value = '';
        load();
    };

    const remove = async (item: MediaItem) => {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setLightbox(null);
        try {
            await fetch(`/api/media/${item.id}`, { method: 'DELETE' });
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
                    <div className="empty-state__icon"><ImageIcon /></div>
                    <h3 className="empty-state__title">No teams yet</h3>
                    <p className="empty-state__description">Join or create a team to start sharing photos and video.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        {activeAlbum ? activeAlbum.name : 'Photos & Video'}
                    </h1>
                    <p className="page-subtitle">
                        {activeAlbum
                            ? activeAlbum.description || `${activeAlbum.itemCount} item${activeAlbum.itemCount === 1 ? '' : 's'}`
                            : 'Share game day photos and clips with the whole team.'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {activeAlbum ? (
                        <button className="btn btn-ghost" onClick={() => setActiveAlbum(null)}>
                            <ChevronLeft size={16} /> All photos
                        </button>
                    ) : (
                        <>
                            {teams.length > 1 && (
                                <select className="form-select" value={teamId} onChange={(e) => setTeamId(e.target.value)} style={{ width: 'auto' }}>
                                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            )}
                            <button className="btn btn-ghost" onClick={() => setShowAlbumForm(true)}>
                                <FolderPlus size={16} /> New album
                            </button>
                        </>
                    )}
                    <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        <Upload size={16} /> {uploading ? `Uploading ${progress.done}/${progress.total}…` : 'Upload'}
                    </button>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                multiple
                hidden
                onChange={(e) => handleFiles(e.target.files)}
            />

            {error && (
                <div className="form-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <span>{error}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setError('')} aria-label="Dismiss"><X size={14} /></button>
                </div>
            )}

            {!activeAlbum && albums.length > 0 && (
                <div className="card" style={{ marginBottom: '1.25rem' }}>
                    <div className="card-header"><h2 className="card-title">Albums</h2></div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                        {albums.map((a) => (
                            <button
                                key={a.id}
                                onClick={() => setActiveAlbum(a)}
                                style={{
                                    padding: 0, border: '1px solid rgba(148,163,184,0.12)', borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden', cursor: 'pointer', background: 'rgba(148,163,184,0.05)', textAlign: 'left',
                                }}
                            >
                                <div style={{ aspectRatio: '4/3', background: 'rgba(148,163,184,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {a.coverUrl
                                        ? <img src={a.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <ImageIcon size={24} color="var(--text-tertiary)" />}
                                </div>
                                <div style={{ padding: '0.5rem 0.6rem' }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{a.itemCount} item{a.itemCount === 1 ? '' : 's'}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {items.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state__icon"><ImageIcon /></div>
                    <h3 className="empty-state__title">Nothing here yet</h3>
                    <p className="empty-state__description">
                        Upload photos and video from the last game — everyone on the team can see them.
                    </p>
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => fileInputRef.current?.click()}>
                        <Plus size={16} /> Upload
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.65rem' }}>
                    {items.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setLightbox(item)}
                            style={{
                                position: 'relative', padding: 0, border: 'none', borderRadius: 'var(--radius-md)',
                                overflow: 'hidden', cursor: 'pointer', aspectRatio: '1', background: 'rgba(148,163,184,0.08)',
                            }}
                        >
                            {item.type === 'VIDEO' ? (
                                <>
                                    <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preload="metadata" muted />
                                    <div style={{
                                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'rgba(0,0,0,0.25)',
                                    }}>
                                        <Play size={28} color="white" fill="white" />
                                    </div>
                                </>
                            ) : (
                                <img src={item.url} alt={item.caption ?? ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                        </button>
                    ))}
                </div>
            )}

            {lightbox && (
                <div className="modal-overlay" onClick={() => setLightbox(null)} style={{ padding: '1rem' }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {lightbox.type === 'VIDEO'
                            ? <video src={lightbox.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 'var(--radius-md)' }} />
                            : <img src={lightbox.url} alt={lightbox.caption ?? ''} style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div className="avatar avatar-sm" style={{ background: getAvatarColor(lightbox.uploaderName) }}>
                                {getInitials(lightbox.uploaderName)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>{lightbox.uploaderName}</div>
                                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)' }}>
                                    {timeAgo(lightbox.createdAt)}{lightbox.caption ? ` · ${lightbox.caption}` : ''}
                                </div>
                            </div>
                            {lightbox.canDelete && (
                                <button className="btn btn-danger btn-sm" onClick={() => remove(lightbox)}>
                                    <Trash2 size={14} /> Delete
                                </button>
                            )}
                            <button className="btn btn-ghost btn-sm" onClick={() => setLightbox(null)} aria-label="Close"><X size={16} /></button>
                        </div>
                    </div>
                </div>
            )}

            {showAlbumForm && (
                <AlbumForm
                    teamId={teamId}
                    onClose={() => setShowAlbumForm(false)}
                    onCreated={() => { setShowAlbumForm(false); load(); }}
                />
            )}
        </div>
    );
}

function AlbumForm({ teamId, onClose, onCreated }: { teamId: string; onClose: () => void; onCreated: () => void }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/media/albums', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId, name, description }),
            });
            const data = await res.json();
            if (data.success) onCreated();
            else setError(data.error || 'Could not create that album.');
        } catch {
            setError('Something went wrong. Try again.');
        }
        setBusy(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ maxWidth: 420 }}>
                <div className="modal-header">
                    <h3 className="modal-title">New album</h3>
                    <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close"><X size={16} /></button>
                </div>
                <div className="modal-body">
                    {error && <div className="form-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}
                    <div className="form-group">
                        <label className="form-label">Name</label>
                        <input className="form-input" required placeholder="e.g. Championship weekend" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
                        <textarea className="form-textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
                        {busy ? 'Creating…' : 'Create album'}
                    </button>
                </div>
            </form>
        </div>
    );
}
