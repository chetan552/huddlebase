'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Users, UserCog, Trophy, CalendarDays, Receipt, Trash2, RefreshCw, History } from 'lucide-react';
import { useAuth } from '@/lib/auth';

type AdminUser = {
    id: string;
    name: string;
    email: string;
    role: string;
    coachApproved: boolean;
    suspended: boolean;
    avatar: string | null;
    createdAt: string;
    teamCount: number;
    authProviderCount: number;
};

type AdminTeam = {
    id: string;
    name: string;
    sport: string;
    season: string | null;
    color: string;
    createdAt: string;
    memberCount: number;
    eventCount: number;
    invoiceCount: number;
    staff: Array<{ id: string; name: string; email: string; role: string }>;
};

type AuditLog = {
    id: string;
    actorEmail: string;
    action: string;
    targetType: string;
    targetId: string;
    targetLabel: string | null;
    metadata: string | null;
    createdAt: string;
};

type AdminData = {
    stats: {
        users: number;
        teams: number;
        events: number;
        invoices: number;
        roleCounts: Record<string, number>;
    };
    users: AdminUser[];
    teams: AdminTeam[];
    auditLogs: AuditLog[];
};

const ROLES = ['ADMIN', 'COACH', 'PARENT', 'PLAYER'];
const ROLE_BADGE: Record<string, string> = {
    ADMIN: 'badge-role-admin',
    COACH: 'badge-role-coach',
    PARENT: 'badge-role-parent',
    PLAYER: 'badge-role-player',
};

export default function AdminPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<AdminData | null>(null);
    const [activeTab, setActiveTab] = useState<'coachRequests' | 'users' | 'teams' | 'audit'>('coachRequests');
    const [query, setQuery] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [busyId, setBusyId] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!loading && user && user.role !== 'ADMIN') {
            router.push('/dashboard');
        }
    }, [loading, router, user]);

    const loadAdminData = async () => {
        setRefreshing(true);
        setError('');
        try {
            const res = await fetch('/api/admin/overview');
            const json = await res.json();
            if (!json.success) {
                setError(json.error || 'Could not load admin data.');
                return;
            }
            setData(json.data);
        } catch {
            setError('Connection error. Please try again.');
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            loadAdminData();
        }
    }, [user?.role]);

    const filteredUsers = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!data) return [];
        if (!term) return data.users;
        return data.users.filter((adminUser) =>
            adminUser.name.toLowerCase().includes(term) ||
            adminUser.email.toLowerCase().includes(term) ||
            adminUser.role.toLowerCase().includes(term)
        );
    }, [data, query]);

    const filteredTeams = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!data) return [];
        if (!term) return data.teams;
        return data.teams.filter((team) =>
            team.name.toLowerCase().includes(term) ||
            team.sport.toLowerCase().includes(term) ||
            team.staff.some((staff) => staff.name.toLowerCase().includes(term) || staff.email.toLowerCase().includes(term))
        );
    }, [data, query]);

    const updateUserRole = async (targetUser: AdminUser, role: string) => {
        setBusyId(targetUser.id);
        setError('');
        setMessage('');
        try {
            const res = await fetch(`/api/admin/users/${targetUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role,
                    coachApproved: role === 'COACH' ? targetUser.coachApproved : role === 'ADMIN',
                    suspended: targetUser.suspended,
                }),
            });
            const json = await res.json();
            if (!json.success) {
                setError(json.error || 'Could not update user role.');
                return;
            }

            setData((current) => current ? {
                ...current,
                users: current.users.map((adminUser) => adminUser.id === targetUser.id ? json.data : adminUser),
                stats: {
                    ...current.stats,
                    roleCounts: current.users.reduce<Record<string, number>>((counts, adminUser) => {
                        const nextRole = adminUser.id === targetUser.id ? role : adminUser.role;
                        counts[nextRole] = (counts[nextRole] || 0) + 1;
                        return counts;
                    }, {}),
                },
            } : current);
            setMessage(`${targetUser.name}'s role was updated to ${role}.`);
        } catch {
            setError('Connection error. Please try again.');
        } finally {
            setBusyId('');
        }
    };

    const updateCoachApproval = async (targetUser: AdminUser, coachApproved: boolean) => {
        setBusyId(targetUser.id);
        setError('');
        setMessage('');
        try {
            const res = await fetch(`/api/admin/users/${targetUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'COACH', coachApproved, suspended: targetUser.suspended }),
            });
            const json = await res.json();
            if (!json.success) {
                setError(json.error || 'Could not update coach approval.');
                return;
            }

            setData((current) => current ? {
                ...current,
                users: current.users.map((adminUser) => adminUser.id === targetUser.id ? json.data : adminUser),
            } : current);
            setMessage(`${targetUser.name}'s coach access was ${coachApproved ? 'approved' : 'revoked'}.`);
        } catch {
            setError('Connection error. Please try again.');
        } finally {
            setBusyId('');
        }
    };

    const updateSuspension = async (targetUser: AdminUser, suspended: boolean) => {
        setBusyId(targetUser.id);
        setError('');
        setMessage('');
        try {
            const res = await fetch(`/api/admin/users/${targetUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: targetUser.role, coachApproved: targetUser.coachApproved, suspended }),
            });
            const json = await res.json();
            if (!json.success) {
                setError(json.error || 'Could not update suspension.');
                return;
            }

            setData((current) => current ? {
                ...current,
                users: current.users.map((adminUser) => adminUser.id === targetUser.id ? json.data : adminUser),
            } : current);
            setMessage(`${targetUser.name} was ${suspended ? 'suspended' : 'unsuspended'}.`);
        } catch {
            setError('Connection error. Please try again.');
        } finally {
            setBusyId('');
        }
    };

    const transferTeamLead = async (team: AdminTeam, userId: string) => {
        if (!userId) return;

        setBusyId(team.id);
        setError('');
        setMessage('');
        try {
            const res = await fetch(`/api/admin/teams/${team.id}/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            const json = await res.json();
            if (!json.success) {
                setError(json.error || 'Could not transfer team lead.');
                return;
            }

            setMessage(`${team.name} lead coach was transferred.`);
            await loadAdminData();
        } catch {
            setError('Connection error. Please try again.');
        } finally {
            setBusyId('');
        }
    };

    const deleteTeam = async (team: AdminTeam) => {
        if (!window.confirm(`Delete ${team.name}? This removes its roster, events, messages, and invoices.`)) return;

        setBusyId(team.id);
        setError('');
        setMessage('');
        try {
            const res = await fetch(`/api/teams/${team.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!json.success) {
                setError(json.error || 'Could not delete team.');
                return;
            }

            setData((current) => current ? {
                ...current,
                teams: current.teams.filter((item) => item.id !== team.id),
                stats: { ...current.stats, teams: Math.max(0, current.stats.teams - 1) },
            } : current);
            setMessage(`${team.name} was deleted.`);
        } catch {
            setError('Connection error. Please try again.');
        } finally {
            setBusyId('');
        }
    };

    if (loading || !user || user.role !== 'ADMIN') {
        return null;
    }

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title page-title--gradient">Admin</h1>
                    <p className="page-subtitle">Manage global users, roles, and teams.</p>
                </div>
                <button className="btn btn-outline" onClick={loadAdminData} disabled={refreshing}>
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {error && <div className="auth-error" style={{ marginBottom: '1rem' }}><span>!</span>{error}</div>}
            {message && <div className="form-success" style={{ marginBottom: '1rem' }}>{message}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <StatCard icon={<Users size={20} />} label="Users" value={data?.stats.users ?? 0} />
                <StatCard icon={<Trophy size={20} />} label="Teams" value={data?.stats.teams ?? 0} />
                <StatCard icon={<CalendarDays size={20} />} label="Events" value={data?.stats.events ?? 0} />
                <StatCard icon={<Receipt size={20} />} label="Invoices" value={data?.stats.invoices ?? 0} />
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                            className={`btn ${activeTab === 'coachRequests' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setActiveTab('coachRequests')}
                        >
                            <ShieldCheck size={16} />
                            Coach Requests
                        </button>
                        <button
                            className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setActiveTab('users')}
                        >
                            <UserCog size={16} />
                            Users
                        </button>
                        <button
                            className={`btn ${activeTab === 'teams' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setActiveTab('teams')}
                        >
                            <ShieldCheck size={16} />
                            Teams
                        </button>
                        <button
                            className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setActiveTab('audit')}
                        >
                            <History size={16} />
                            Audit
                        </button>
                    </div>
                    <input
                        className="form-input"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={activeTab === 'teams' ? 'Search teams...' : activeTab === 'audit' ? 'Search audit...' : 'Search users...'}
                        style={{ maxWidth: 320 }}
                    />
                </div>

                {activeTab === 'coachRequests' ? (
                    <UserList
                        users={filteredUsers.filter((adminUser) => adminUser.role === 'COACH' && !adminUser.coachApproved)}
                        currentUserId={user.id}
                        busyId={busyId}
                        onRoleChange={updateUserRole}
                        onCoachApproval={updateCoachApproval}
                        onSuspension={updateSuspension}
                    />
                ) : activeTab === 'users' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {filteredUsers.map((adminUser) => (
                            <div key={adminUser.id} className="glass-subtle" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {adminUser.name}
                                        {adminUser.id === user.id && <span className="badge badge-neutral">You</span>}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adminUser.email}</div>
                                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                                        {adminUser.teamCount} team{adminUser.teamCount === 1 ? '' : 's'} · {adminUser.authProviderCount > 0 ? 'OAuth linked' : 'Password account'}
                                    </div>
                                </div>
                                <UserStatus user={adminUser} />
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <select
                                        className="form-input form-select"
                                        value={adminUser.role}
                                        onChange={(e) => updateUserRole(adminUser, e.target.value)}
                                        disabled={busyId === adminUser.id || adminUser.id === user.id}
                                        title={adminUser.id === user.id ? 'You cannot remove your own admin role' : 'Change role'}
                                        style={{ flex: '1 1 140px', cursor: adminUser.id === user.id ? 'not-allowed' : undefined }}
                                    >
                                        {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                                    </select>
                                    {adminUser.role === 'COACH' && (
                                        <button
                                            type="button"
                                            className={`btn ${adminUser.coachApproved ? 'btn-outline' : 'btn-primary'}`}
                                            onClick={() => updateCoachApproval(adminUser, !adminUser.coachApproved)}
                                            disabled={busyId === adminUser.id}
                                        >
                                            {adminUser.coachApproved ? 'Revoke' : 'Approve'}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className={`btn ${adminUser.suspended ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => updateSuspension(adminUser, !adminUser.suspended)}
                                        disabled={busyId === adminUser.id || adminUser.id === user.id}
                                        title={adminUser.id === user.id ? 'You cannot suspend your own account' : undefined}
                                    >
                                        {adminUser.id === user.id ? 'Protected' : adminUser.suspended ? 'Unsuspend' : 'Suspend'}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredUsers.length === 0 && <EmptyState label="No users match your search." />}
                    </div>
                ) : activeTab === 'teams' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {filteredTeams.map((team) => (
                            <div key={team.id} className="glass-subtle" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: team.color }} />
                                        <span style={{ fontWeight: 700 }}>{team.name}</span>
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                        {team.sport}{team.season ? ` · ${team.season}` : ''}
                                    </div>
                                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                                        {team.memberCount} members · {team.eventCount} events · {team.invoiceCount} invoices
                                    </div>
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Staff</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        {team.staff.length > 0
                                            ? team.staff.map((staff) => `${staff.name} (${staff.role})`).join(', ')
                                            : 'No staff assigned'}
                                    </div>
                                </div>
                                <button className="btn btn-danger" onClick={() => deleteTeam(team)} disabled={busyId === team.id}>
                                    <Trash2 size={16} />
                                    {busyId === team.id ? 'Deleting...' : 'Delete'}
                                </button>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <select
                                        className="form-input form-select"
                                        defaultValue=""
                                        onChange={(event) => {
                                            if (!event.target.value) return;
                                            transferTeamLead(team, event.target.value);
                                            event.target.value = '';
                                        }}
                                        disabled={busyId === team.id}
                                    >
                                        <option value="">Transfer lead coach...</option>
                                        {data?.users
                                            .filter((adminUser) => !adminUser.suspended)
                                            .map((adminUser) => (
                                                <option key={adminUser.id} value={adminUser.id}>
                                                    {adminUser.name} ({adminUser.email})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                        {filteredTeams.length === 0 && <EmptyState label="No teams match your search." />}
                    </div>
                ) : (
                    <AuditList logs={data?.auditLogs || []} query={query} />
                )}
            </div>
        </div>
    );
}

function UserStatus({ user }: { user: AdminUser }) {
    if (user.suspended) {
        return <span className="badge badge-danger" style={{ justifySelf: 'start' }}>SUSPENDED</span>;
    }

    return (
        <span className={`badge ${ROLE_BADGE[user.role] || 'badge-neutral'}`} style={{ justifySelf: 'start' }}>
            {user.role === 'COACH' && !user.coachApproved ? 'COACH PENDING' : user.role}
        </span>
    );
}

function UserList({
    users,
    currentUserId,
    busyId,
    onRoleChange,
    onCoachApproval,
    onSuspension,
}: {
    users: AdminUser[];
    currentUserId: string;
    busyId: string;
    onRoleChange: (user: AdminUser, role: string) => void;
    onCoachApproval: (user: AdminUser, approved: boolean) => void;
    onSuspension: (user: AdminUser, suspended: boolean) => void;
}) {
    if (users.length === 0) return <EmptyState label="No pending coach requests." />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {users.map((adminUser) => (
                <div key={adminUser.id} className="glass-subtle" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700 }}>{adminUser.name}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adminUser.email}</div>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                            Requested {new Date(adminUser.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                    <UserStatus user={adminUser} />
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={() => onCoachApproval(adminUser, true)} disabled={busyId === adminUser.id}>
                            Approve
                        </button>
                        <button className="btn btn-outline" onClick={() => onRoleChange(adminUser, 'PLAYER')} disabled={busyId === adminUser.id}>
                            Reject
                        </button>
                        <button
                            className="btn btn-outline"
                            onClick={() => onSuspension(adminUser, !adminUser.suspended)}
                            disabled={busyId === adminUser.id || adminUser.id === currentUserId}
                        >
                            {adminUser.suspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function AuditList({ logs, query }: { logs: AuditLog[]; query: string }) {
    const term = query.trim().toLowerCase();
    const filtered = term
        ? logs.filter((log) =>
            log.actorEmail.toLowerCase().includes(term) ||
            log.action.toLowerCase().includes(term) ||
            log.targetType.toLowerCase().includes(term) ||
            (log.targetLabel || '').toLowerCase().includes(term)
        )
        : logs;

    if (filtered.length === 0) return <EmptyState label="No audit entries match your search." />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map((log) => (
                <div key={log.id} className="glass-subtle" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(180px, 0.8fr) minmax(180px, 0.8fr)', gap: '1rem' }}>
                    <div>
                        <div style={{ fontWeight: 700 }}>{log.action}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                            {log.targetType}: {log.targetLabel || log.targetId}
                        </div>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {log.actorEmail}
                    </div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                        {new Date(log.createdAt).toLocaleString()}
                    </div>
                </div>
            ))}
        </div>
    );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
    return (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(59, 130, 246, 0.12)',
                color: 'var(--primary-300)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {icon}
            </div>
            <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{label}</div>
                <div style={{ fontWeight: 800, fontSize: '1.35rem' }}>{value.toLocaleString()}</div>
            </div>
        </div>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="glass-subtle" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {label}
        </div>
    );
}
