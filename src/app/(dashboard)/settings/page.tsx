'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { getAvatarColor, getInitials } from '@/lib/utils';

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
        <div
            onClick={onToggle}
            style={{
                width: 44, height: 24, borderRadius: 12,
                background: on ? 'var(--primary-500)' : 'var(--surface-500)',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
            }}
        >
            <div style={{
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 2,
                left: on ? 22 : 2,
                transition: 'left 0.2s',
            }} />
        </div>
    );
}

export default function SettingsPage() {
    const { user, logout, refreshUser } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState(true);
    const [emailUpdates, setEmailUpdates] = useState(false);
    const [darkMode, setDarkMode] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize dark mode from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('huddlebase-theme');
        if (saved === 'light') {
            setDarkMode(false);
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, []);

    const toggleDarkMode = () => {
        const newValue = !darkMode;
        setDarkMode(newValue);
        if (newValue) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('huddlebase-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('huddlebase-theme', 'light');
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
            const uploadData = await uploadRes.json();
            if (!uploadData.success) throw new Error(uploadData.error);

            await fetch('/api/auth/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatar: uploadData.data.url }),
            });

            if (refreshUser) await refreshUser();
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    if (!user) return null;

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">Manage your account and preferences</p>
                </div>
            </div>

            {/* Profile Section */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h2 className="card-title" style={{ marginBottom: '1.5rem' }}>Profile</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div
                        style={{ position: 'relative', cursor: 'pointer' }}
                        onClick={() => fileInputRef.current?.click()}
                        title="Click to change avatar"
                    >
                        {user.avatar ? (
                            <img
                                src={user.avatar}
                                alt={user.name}
                                className="avatar avatar-xl"
                                style={{ objectFit: 'cover' }}
                            />
                        ) : (
                            <div
                                className="avatar avatar-xl"
                                style={{ background: getAvatarColor(user.name) }}
                            >
                                {getInitials(user.name)}
                            </div>
                        )}
                        <div style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'var(--primary-500)', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', border: '2px solid var(--surface-800)',
                        }}>
                            {uploading ? '⏳' : '📷'}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            style={{ display: 'none' }}
                            onChange={handleAvatarUpload}
                        />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{user.name}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user.email}</p>
                        <span className="badge badge-primary" style={{ marginTop: '0.5rem' }}>
                            {user.role}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '600px' }}>
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input className="form-input" value={user.name} readOnly />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" value={user.email} readOnly />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Role</label>
                        <input className="form-input" value={user.role} readOnly />
                    </div>
                </div>
            </div>

            {/* Preferences */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h2 className="card-title" style={{ marginBottom: '1.5rem' }}>Preferences</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '1rem', background: 'var(--surface-700)', borderRadius: '0.75rem',
                    }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>🔔 Push Notifications</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                Receive notifications for events and messages
                            </div>
                        </div>
                        <Toggle on={notifications} onToggle={() => setNotifications(!notifications)} />
                    </div>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '1rem', background: 'var(--surface-700)', borderRadius: '0.75rem',
                    }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>📧 Email Updates</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                Weekly digest of team activity
                            </div>
                        </div>
                        <Toggle on={emailUpdates} onToggle={() => setEmailUpdates(!emailUpdates)} />
                    </div>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '1rem', background: 'var(--surface-700)', borderRadius: '0.75rem',
                    }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>🌙 Dark Mode</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                Always use dark theme
                            </div>
                        </div>
                        <Toggle on={darkMode} onToggle={toggleDarkMode} />
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <h2 className="card-title" style={{ marginBottom: '1rem', color: 'var(--danger-400)' }}>
                    Danger Zone
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Once you log out, you&apos;ll need to sign in again to access your teams.
                </p>
                <button className="btn btn-danger" onClick={handleLogout}>
                    🚪 Log Out
                </button>
            </div>
        </div>
    );
}
