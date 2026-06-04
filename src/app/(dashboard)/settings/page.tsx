'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { getAvatarColor, getInitials } from '@/lib/utils';
import { useTheme } from '@/lib/useTheme';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/passwordPolicy';
import { Bell, Mail, Moon, Camera, Loader2, LogOut, AlertTriangle, ShieldCheck, LifeBuoy } from 'lucide-react';

const SUPPORT_CATEGORIES = [
    { value: 'ACCOUNT', label: 'Account' },
    { value: 'COACH_APPROVAL', label: 'Coach approval' },
    { value: 'TEAM_ISSUE', label: 'Team issue' },
    { value: 'BILLING', label: 'Billing' },
    { value: 'AI_ACCESS', label: 'AI access' },
    { value: 'OTHER', label: 'Other' },
];

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
    const [profileName, setProfileName] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileMessage, setProfileMessage] = useState('');
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [recoveryCodesRemaining, setRecoveryCodesRemaining] = useState(0);
    const [securityPassword, setSecurityPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [twoFactorSecret, setTwoFactorSecret] = useState('');
    const [twoFactorOtpAuthUrl, setTwoFactorOtpAuthUrl] = useState('');
    const [twoFactorQrDataUrl, setTwoFactorQrDataUrl] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [securityError, setSecurityError] = useState('');
    const [securityMessage, setSecurityMessage] = useState('');
    const [securityLoading, setSecurityLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [changePasswordLoading, setChangePasswordLoading] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [supportCategory, setSupportCategory] = useState('OTHER');
    const [supportSubject, setSupportSubject] = useState('');
    const [supportMessage, setSupportMessage] = useState('');
    const [supportLoading, setSupportLoading] = useState(false);
    const [supportError, setSupportError] = useState('');
    const [supportSuccess, setSupportSuccess] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const darkMode = theme === 'dark';

    useEffect(() => {
        if (user?.name) setProfileName(user.name);
    }, [user?.name]);

    useEffect(() => {
        fetch('/api/auth/2fa/status')
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setTwoFactorEnabled(data.data.enabled);
                    setRecoveryCodesRemaining(data.data.recoveryCodesRemaining);
                }
            })
            .catch(() => undefined);
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function renderQrCode() {
            if (!twoFactorOtpAuthUrl) {
                setTwoFactorQrDataUrl('');
                return;
            }

            try {
                const dataUrl = await QRCode.toDataURL(twoFactorOtpAuthUrl, {
                    errorCorrectionLevel: 'M',
                    margin: 2,
                    width: 220,
                    color: {
                        dark: '#0f172a',
                        light: '#ffffff',
                    },
                });
                if (!cancelled) setTwoFactorQrDataUrl(dataUrl);
            } catch {
                if (!cancelled) setTwoFactorQrDataUrl('');
            }
        }

        renderQrCode();
        return () => { cancelled = true; };
    }, [twoFactorOtpAuthUrl]);

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

    const updateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        const nextName = profileName.trim();

        setProfileError('');
        setProfileMessage('');

        if (!nextName) {
            setProfileError('Name is required.');
            return;
        }

        if (nextName === user?.name) {
            setProfileMessage('Profile is already up to date.');
            return;
        }

        setProfileLoading(true);
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nextName }),
            });
            const data = await res.json();
            if (!data.success) {
                setProfileError(data.error || 'Could not update profile.');
                return;
            }

            setProfileMessage('Profile updated.');
            if (refreshUser) await refreshUser();
        } catch {
            setProfileError('Connection error. Please try again.');
        } finally {
            setProfileLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    const submitSupportRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setSupportLoading(true);
        setSupportError('');
        setSupportSuccess('');

        const subject = supportSubject.trim();
        const message = supportMessage.trim();

        if (!subject || !message) {
            setSupportError('Subject and message are required.');
            setSupportLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: supportCategory, subject, message }),
            });
            const data = await res.json();
            if (!data.success) {
                setSupportError(data.error || 'Could not submit your request.');
                return;
            }

            setSupportSubject('');
            setSupportMessage('');
            setSupportCategory('OTHER');
            setSupportSuccess('Your request was sent to the admins.');
        } catch {
            setSupportError('Connection error. Please try again.');
        } finally {
            setSupportLoading(false);
        }
    };

    const deleteAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setDeleteLoading(true);
        setDeleteError('');

        try {
            const res = await fetch('/api/auth/account', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: deletePassword,
                    confirmation: deleteConfirmation,
                }),
            });
            const data = await res.json();
            if (!data.success) {
                setDeleteError(data.error || 'Could not delete account.');
                return;
            }

            await logout();
            router.push('/login');
        } catch {
            setDeleteError('Connection error. Please try again.');
        } finally {
            setDeleteLoading(false);
        }
    };

    const sendPasswordReset = async () => {
        if (!user?.email) return;
        setResetLoading(true);
        setSecurityError('');
        setSecurityMessage('');
        try {
            const res = await fetch('/api/auth/password-reset/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email }),
            });
            const data = await res.json();
            if (!data.success) {
                setSecurityError(data.error || 'Could not send password reset link.');
                return;
            }
            setSecurityMessage(data.message || 'Password reset link sent.');
        } catch {
            setSecurityError('Connection error. Please try again.');
        } finally {
            setResetLoading(false);
        }
    };

    const changePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setChangePasswordLoading(true);
        setSecurityError('');
        setSecurityMessage('');

        if (!isStrongPassword(newPassword)) {
            setSecurityError(PASSWORD_POLICY_MESSAGE);
            setChangePasswordLoading(false);
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setSecurityError('New passwords do not match.');
            setChangePasswordLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/password/change', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (!data.success) {
                setSecurityError(data.error || 'Could not update password.');
                return;
            }
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setSecurityMessage(data.message || 'Password updated successfully.');
        } catch {
            setSecurityError('Connection error. Please try again.');
        } finally {
            setChangePasswordLoading(false);
        }
    };

    const startTwoFactorSetup = async () => {
        setSecurityLoading(true);
        setSecurityError('');
        setSecurityMessage('');
        setRecoveryCodes([]);
        setTwoFactorQrDataUrl('');
        try {
            const res = await fetch('/api/auth/2fa/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: securityPassword }),
            });
            const data = await res.json();
            if (!data.success) {
                setSecurityError(data.error || 'Could not start two-factor setup.');
                return;
            }
            setTwoFactorSecret(data.data.secret);
            setTwoFactorOtpAuthUrl(data.data.otpauthUrl);
            setSecurityMessage('Add this secret to your authenticator app, then enter the 6-digit code.');
        } catch {
            setSecurityError('Connection error. Please try again.');
        } finally {
            setSecurityLoading(false);
        }
    };

    const verifyTwoFactorSetup = async () => {
        setSecurityLoading(true);
        setSecurityError('');
        setSecurityMessage('');
        try {
            const res = await fetch('/api/auth/2fa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: twoFactorCode }),
            });
            const data = await res.json();
            if (!data.success) {
                setSecurityError(data.error || 'Could not enable two-factor authentication.');
                return;
            }
            setTwoFactorEnabled(true);
            setRecoveryCodes(data.data.recoveryCodes);
            setRecoveryCodesRemaining(data.data.recoveryCodes.length);
            setTwoFactorCode('');
            setTwoFactorSecret('');
            setTwoFactorOtpAuthUrl('');
            setTwoFactorQrDataUrl('');
            setSecurityPassword('');
            setSecurityMessage('Two-factor authentication is now enabled. Store your recovery codes somewhere safe.');
        } catch {
            setSecurityError('Connection error. Please try again.');
        } finally {
            setSecurityLoading(false);
        }
    };

    const disableTwoFactor = async () => {
        setSecurityLoading(true);
        setSecurityError('');
        setSecurityMessage('');
        try {
            const res = await fetch('/api/auth/2fa/disable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: securityPassword, code: twoFactorCode }),
            });
            const data = await res.json();
            if (!data.success) {
                setSecurityError(data.error || 'Could not disable two-factor authentication.');
                return;
            }
            setTwoFactorEnabled(false);
            setRecoveryCodesRemaining(0);
            setRecoveryCodes([]);
            setTwoFactorCode('');
            setSecurityPassword('');
            setSecurityMessage('Two-factor authentication has been disabled.');
        } catch {
            setSecurityError('Connection error. Please try again.');
        } finally {
            setSecurityLoading(false);
        }
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

                {profileError && <div className="auth-error" style={{ marginBottom: '1rem', maxWidth: '600px' }}><span>!</span>{profileError}</div>}
                {profileMessage && <div className="form-success" style={{ marginBottom: '1rem', maxWidth: '600px' }}>{profileMessage}</div>}

                <form onSubmit={updateProfile} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', maxWidth: '600px', alignItems: 'end' }}>
                    <div className="form-group" style={{ flex: '1 1 250px' }}>
                        <label className="form-label" htmlFor="profile-name">Full Name</label>
                        <input
                            id="profile-name"
                            className="form-input"
                            value={profileName}
                            onChange={(e) => {
                                setProfileName(e.target.value);
                                setProfileError('');
                                setProfileMessage('');
                            }}
                            autoComplete="name"
                            required
                        />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 250px' }}>
                        <label className="form-label">Email</label>
                        <input className="form-input" value={user.email} readOnly />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 100%' }}>
                        <label className="form-label">Role</label>
                        <input className="form-input" value={user.role} readOnly />
                    </div>
                    <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={profileLoading || !profileName.trim() || profileName.trim() === user.name}
                    >
                        {profileLoading ? 'Saving...' : 'Save Profile'}
                    </button>
                </form>
            </div>

            {user.role !== 'ADMIN' && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 className="card-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <LifeBuoy size={18} />
                        Contact Admin
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', maxWidth: 720 }}>
                        Send a request to your HuddleBase admins for account help, coach approval, team issues, billing, or AI access.
                    </p>

                    {supportError && <div className="auth-error" style={{ marginBottom: '1rem', maxWidth: '720px' }}><span>!</span>{supportError}</div>}
                    {supportSuccess && <div className="form-success" style={{ marginBottom: '1rem', maxWidth: '720px' }}>{supportSuccess}</div>}

                    <form onSubmit={submitSupportRequest} style={{ display: 'grid', gap: '1rem', maxWidth: 720 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" htmlFor="support-category">Category</label>
                                <select
                                    id="support-category"
                                    className="form-input form-select"
                                    value={supportCategory}
                                    onChange={(e) => setSupportCategory(e.target.value)}
                                >
                                    {SUPPORT_CATEGORIES.map((category) => (
                                        <option key={category.value} value={category.value}>{category.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" htmlFor="support-subject">Subject</label>
                                <input
                                    id="support-subject"
                                    className="form-input"
                                    value={supportSubject}
                                    onChange={(e) => {
                                        setSupportSubject(e.target.value);
                                        setSupportError('');
                                        setSupportSuccess('');
                                    }}
                                    maxLength={140}
                                    placeholder="Need AI access for practice plans"
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" htmlFor="support-message">Message</label>
                            <textarea
                                id="support-message"
                                className="form-input"
                                rows={5}
                                value={supportMessage}
                                onChange={(e) => {
                                    setSupportMessage(e.target.value);
                                    setSupportError('');
                                    setSupportSuccess('');
                                }}
                                maxLength={3000}
                                placeholder="Tell the admins what you need help with."
                                required
                            />
                        </div>
                        <div>
                            <button
                                className="btn btn-primary"
                                type="submit"
                                disabled={supportLoading || !supportSubject.trim() || !supportMessage.trim()}
                            >
                                {supportLoading ? 'Sending...' : 'Send to Admin'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Security */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h2 className="card-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={18} />
                    Security
                </h2>
                <div className="glass-subtle" style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Password Reset</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                            Send a secure password reset link to {user.email}.
                        </div>
                    </div>
                    <button className="btn btn-outline" onClick={sendPasswordReset} disabled={resetLoading}>
                        {resetLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </div>
                <form className="glass-subtle" style={{ padding: '1rem', marginBottom: '1rem' }} onSubmit={changePassword}>
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Update Password</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                            Change your password immediately after confirming your current password.
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" htmlFor="current-password">Current Password</label>
                            <input
                                id="current-password"
                                className="form-input"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" htmlFor="new-password">New Password</label>
                            <input
                                id="new-password"
                                className="form-input"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoComplete="new-password"
                                minLength={10}
                                required
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" htmlFor="confirm-new-password">Confirm New Password</label>
                            <input
                                id="confirm-new-password"
                                className="form-input"
                                type="password"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                autoComplete="new-password"
                                minLength={10}
                                required
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            type="submit"
                            disabled={changePasswordLoading || !currentPassword || !newPassword || !confirmNewPassword}
                        >
                            {changePasswordLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
                <div className="glass-subtle" style={{ padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Two-Factor Authentication</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                                {twoFactorEnabled
                                    ? `Enabled. ${recoveryCodesRemaining} recovery code${recoveryCodesRemaining === 1 ? '' : 's'} remaining.`
                                    : 'Protect your account with an authenticator app.'}
                            </div>
                        </div>
                        <span className={`badge ${twoFactorEnabled ? 'badge-success' : 'badge-neutral'}`}>
                            {twoFactorEnabled ? 'Enabled' : 'Off'}
                        </span>
                    </div>

                    {securityError && <div className="auth-error" style={{ marginBottom: '1rem' }}><span>!</span>{securityError}</div>}
                    {securityMessage && <div className="form-success" style={{ marginBottom: '1rem' }}>{securityMessage}</div>}

                    {!twoFactorEnabled && !twoFactorSecret && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ flex: '1 1 260px', marginBottom: 0 }}>
                                <label className="form-label">Confirm Password</label>
                                <input
                                    className="form-input"
                                    type="password"
                                    value={securityPassword}
                                    onChange={(e) => setSecurityPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                            </div>
                            <button className="btn btn-primary" onClick={startTwoFactorSetup} disabled={securityLoading || !securityPassword}>
                                {securityLoading ? 'Starting...' : 'Set Up 2FA'}
                            </button>
                        </div>
                    )}

                    {!twoFactorEnabled && twoFactorSecret && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {twoFactorQrDataUrl && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    flexWrap: 'wrap',
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-lg)',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(148, 163, 184, 0.12)',
                                }}>
                                    <img
                                        src={twoFactorQrDataUrl}
                                        alt="Two-factor authentication QR code"
                                        width={220}
                                        height={220}
                                        style={{
                                            width: 220,
                                            height: 220,
                                            borderRadius: 'var(--radius-md)',
                                            background: '#ffffff',
                                            padding: 8,
                                        }}
                                    />
                                    <div style={{ flex: '1 1 220px' }}>
                                        <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Scan QR Code</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                            Open your authenticator app, scan this code, then enter the 6-digit verification code below.
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Authenticator Secret</label>
                                <input className="form-input" value={twoFactorSecret} readOnly />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Authenticator URI</label>
                                <input className="form-input" value={twoFactorOtpAuthUrl} readOnly />
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
                                <div className="form-group" style={{ flex: '1 1 220px', marginBottom: 0 }}>
                                    <label className="form-label">Verification Code</label>
                                    <input
                                        className="form-input"
                                        value={twoFactorCode}
                                        onChange={(e) => setTwoFactorCode(e.target.value)}
                                        placeholder="123456"
                                        autoComplete="one-time-code"
                                    />
                                </div>
                                <button className="btn btn-primary" onClick={verifyTwoFactorSetup} disabled={securityLoading || !twoFactorCode}>
                                    {securityLoading ? 'Verifying...' : 'Enable 2FA'}
                                </button>
                            </div>
                        </div>
                    )}

                    {twoFactorEnabled && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ flex: '1 1 220px', marginBottom: 0 }}>
                                <label className="form-label">Password</label>
                                <input
                                    className="form-input"
                                    type="password"
                                    value={securityPassword}
                                    onChange={(e) => setSecurityPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                            </div>
                            <div className="form-group" style={{ flex: '1 1 220px', marginBottom: 0 }}>
                                <label className="form-label">Authenticator Code</label>
                                <input
                                    className="form-input"
                                    value={twoFactorCode}
                                    onChange={(e) => setTwoFactorCode(e.target.value)}
                                    placeholder="123456"
                                    autoComplete="one-time-code"
                                />
                            </div>
                            <button className="btn btn-danger" onClick={disableTwoFactor} disabled={securityLoading || !securityPassword || !twoFactorCode}>
                                {securityLoading ? 'Disabling...' : 'Disable 2FA'}
                            </button>
                        </div>
                    )}

                    {recoveryCodes.length > 0 && (
                        <div className="glass-subtle" style={{ marginTop: '1rem', padding: '1rem' }}>
                            <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Recovery Codes</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
                                {recoveryCodes.map((code) => (
                                    <code key={code} style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{code}</code>
                                ))}
                            </div>
                        </div>
                    )}
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
                <div className="glass-subtle" style={{ padding: '1rem', marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        Once you log out, you&apos;ll need to sign in again to access your teams.
                    </p>
                    <button className="btn btn-danger" onClick={handleLogout} style={{ gap: '0.5rem' }}>
                        <LogOut size={16} /> Log Out
                    </button>
                </div>

                <form className="glass-subtle" style={{ padding: '1rem' }} onSubmit={deleteAccount}>
                    <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Delete Account</div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                        Permanently delete your account and remove your memberships, messages, RSVP records, attendance, notifications,
                        family links, feedback, and other user-owned data. This cannot be undone. If you are the last admin or the last
                        staff member on a team, you&apos;ll need to transfer access or delete that team first.
                    </p>

                    {deleteError && <div className="auth-error" style={{ marginBottom: '1rem' }}><span>!</span>{deleteError}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" htmlFor="delete-password">Password</label>
                            <input
                                id="delete-password"
                                className="form-input"
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                placeholder="Required for password accounts"
                                autoComplete="current-password"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" htmlFor="delete-confirmation">Type DELETE</label>
                            <input
                                id="delete-confirmation"
                                className="form-input"
                                value={deleteConfirmation}
                                onChange={(e) => setDeleteConfirmation(e.target.value)}
                                placeholder="DELETE"
                            />
                        </div>
                        <button
                            className="btn btn-danger"
                            type="submit"
                            disabled={deleteLoading || deleteConfirmation !== 'DELETE'}
                        >
                            {deleteLoading ? 'Deleting...' : 'Delete Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
