export const Colors = {
    // Core
    background: '#0a0e1a',
    surface: '#111827',
    surfaceLight: '#1e293b',
    surfaceLighter: '#334155',
    border: '#1e293b',
    borderLight: '#334155',

    // Primary
    primary: '#3b82f6',
    primaryLight: '#60a5fa',
    primaryDark: '#2563eb',
    primaryBg: 'rgba(59, 130, 246, 0.12)',

    // Text
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
    textInverse: '#0f172a',

    // Status
    success: '#4ade80',
    successBg: 'rgba(34, 197, 94, 0.15)',
    warning: '#fbbf24',
    warningBg: 'rgba(245, 158, 11, 0.15)',
    danger: '#f87171',
    dangerBg: 'rgba(239, 68, 68, 0.15)',
    info: '#38bdf8',

    // Event types
    practice: '#3b82f6',
    game: '#ef4444',
    meeting: '#f59e0b',
    other: '#8b5cf6',

    // Roles
    coach: '#3b82f6',
    player: '#14b8a6',
    parent: '#f59e0b',
    manager: '#8b5cf6',
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

export const FontSize = {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    hero: 36,
};

export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
};

export function getAvatarColor(name: string): string {
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#14b8a6', '#ec4899', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

export function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
}
