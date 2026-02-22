/**
 * HuddleBase Utility Functions
 */

// Format a date to readable string
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...options,
    });
}

// Format time
export function formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

// Format date + time
export function formatDateTime(date: Date | string): string {
    return `${formatDate(date)} at ${formatTime(date)}`;
}

// Relative time (e.g., "2 hours ago")
export function timeAgo(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    const intervals: [number, string][] = [
        [31536000, 'year'],
        [2592000, 'month'],
        [86400, 'day'],
        [3600, 'hour'],
        [60, 'minute'],
    ];

    for (const [secs, label] of intervals) {
        const count = Math.floor(seconds / secs);
        if (count >= 1) {
            return `${count} ${label}${count > 1 ? 's' : ''} ago`;
        }
    }
    return 'just now';
}

// Format currency
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
}

// Generate avatar color from name
export function getAvatarColor(name: string): string {
    const colors = [
        '#3b82f6', '#14b8a6', '#8b5cf6', '#f59e0b',
        '#ef4444', '#22c55e', '#ec4899', '#06b6d4',
        '#6366f1', '#84cc16',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

// Get initials from name
export function getInitials(name: string): string {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// Pluralize text
export function pluralize(count: number, singular: string, plural?: string): string {
    return count === 1 ? singular : (plural || `${singular}s`);
}

// Capitalize first letter
export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Generate a random ID
export function generateId(): string {
    return crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
}

// Parse event type to label
export function eventTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        PRACTICE: 'Practice',
        GAME: 'Game',
        MEETING: 'Meeting',
        OTHER: 'Other',
    };
    return labels[type] || type;
}

// Parse event type to color
export function eventTypeColor(type: string): string {
    const colors: Record<string, string> = {
        PRACTICE: '#3b82f6',
        GAME: '#ef4444',
        MEETING: '#f59e0b',
        OTHER: '#8b5cf6',
    };
    return colors[type] || '#64748b';
}

// RSVP status styling
export function rsvpStatusStyle(status: string): { color: string; bg: string; label: string } {
    const styles: Record<string, { color: string; bg: string; label: string }> = {
        GOING: { color: '#4ade80', bg: 'rgba(34, 197, 94, 0.15)', label: 'Going' },
        MAYBE: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', label: 'Maybe' },
        NOT_GOING: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', label: 'Not Going' },
        PENDING: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', label: 'Pending' },
    };
    return styles[status] || styles.PENDING;
}

// Invoice status styling
export function invoiceStatusStyle(status: string): { color: string; bg: string; label: string } {
    const styles: Record<string, { color: string; bg: string; label: string }> = {
        PAID: { color: '#4ade80', bg: 'rgba(34, 197, 94, 0.15)', label: 'Paid' },
        PENDING: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', label: 'Pending' },
        OVERDUE: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', label: 'Overdue' },
        CANCELLED: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', label: 'Cancelled' },
    };
    return styles[status] || styles.PENDING;
}
