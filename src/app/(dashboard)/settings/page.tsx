'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { getAvatarColor, getInitials } from '@/lib/utils';
import { useTheme } from '@/lib/useTheme';
import { Bell, Mail, Moon, Camera, Loader2, LogOut, AlertTriangle } from 'lucide-react';

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            onClick={onToggle}
            style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', padding: 0,
                background: on ? 'var(--gradient-brand)' : 'rgba(148, 163, 184, 0.20)',
                position: 'relative', cursor: 'pointer',
                transition: 'background 0.2s',
                boxShadow: on ? '0 0 14px rgba(59, 130, 246, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.18)' : 'inset 0 1px 2px rgba(0, 0, 0, 0.2)',
            }}
        >
            <span style={{
                display: 'block',
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3,
                left: on ? 23 : 3,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
            }} />
        </button>
    );
}

export default function SettingsPage() {
    const { user, logout, refreshUser } = useAuth();
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const [notifications, setNotifications] = useState(true);
    const [emailUpdates, setEmailUpdates] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const darkMode = theme === 'dark';

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
                    <h1 className="page-title page-title--gradient">Settings</h1>
                    <p className="page-subtitle">Manage your account and preferences</p>
                </div>
            </div>

            {/* Profile Section */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h2 className="card-title" style={{ marginBottom: '1.5rem' }}>Profile</h2>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
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
                            width: 26, height: 26, borderRadius: '50%',
                            background: 'var(--gradient-brand)', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid var(--surface-900)',
                            boxShadow: '0 4px 10px rgba(59, 130, 246, 0.30)',
                        }}>
                            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
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

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', maxWidth: '600px' }}>
                    <div className="form-group" style={{ flex: '1 1 250px' }}>
                        <label className="form-label">Full Name</label>
                        <input className="form-input" value={user.name} readOnly />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 250px' }}>
                        <label className="form-label">Email</label>
                        <input className="form-input" value={user.email} readOnly />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 100%' }}>
                        <label className="form-label">Role</label>
                        <input className="form-input" value={user.role} readOnly />
                    </div>
                </div>
            </div>

            {/* Preferences */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h2 className="card-title" style={{ marginBottom: '1.5rem' }}>Preferences</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="glass-subtle" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '1rem',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Bell size={18} color="var(--primary-400)" />
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Push Notifications</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    Receive notifications for events and messages
                                </div>
                            </div>
                        </div>
                        <Toggle on={notifications} onToggle={() => setNotifications(!notifications)} label="Push Notifications" />
                    </div>
                    <div className="glass-subtle" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '1rem',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Mail size={18} color="var(--accent-400)" />
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Email Updates</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    Weekly digest of team activity
                                </div>
                            </div>
                        </div>
                        <Toggle on={emailUpdates} onToggle={() => setEmailUpdates(!emailUpdates)} label="Email Updates" />
                    </div>
                    <div className="glass-subtle" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '1rem',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Moon size={18} color="var(--primary-400)" />
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Dark Mode</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    Always use dark theme
                                </div>
                            </div>
                        </div>
                        <Toggle on={darkMode} onToggle={toggleTheme} label="Dark Mode" />
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="card" style={{ background: 'rgba(239, 68, 68, 0.06)', borderColor: 'rgba(239, 68, 68, 0.30)' }}>
                <h2 className="card-title" style={{ marginBottom: '1rem', color: 'var(--danger-400)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={18} />
                    Danger Zone
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Once you log out, you&apos;ll need to sign in again to access your teams.
                </p>
                <button className="btn btn-danger" onClick={handleLogout} style={{ gap: '0.5rem' }}>
                    <LogOut size={16} /> Log Out
                </button>
            </div>
        </div>
    );
}
