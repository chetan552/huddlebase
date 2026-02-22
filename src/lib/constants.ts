/**
 * HuddleBase Constants
 */

export const APP_NAME = 'HuddleBase';
export const APP_TAGLINE = 'The heartbeat of your team.';
export const APP_DESCRIPTION = 'A modern, all-in-one platform for managing sports teams, clubs, and leagues.';

// User Roles
export const ROLES = {
    ADMIN: 'ADMIN',
    COACH: 'COACH',
    PARENT: 'PARENT',
    PLAYER: 'PLAYER',
} as const;

export const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Admin',
    COACH: 'Coach',
    PARENT: 'Parent',
    PLAYER: 'Player',
};

export const ROLE_COLORS: Record<string, string> = {
    ADMIN: '#8b5cf6',
    COACH: '#3b82f6',
    PARENT: '#f59e0b',
    PLAYER: '#14b8a6',
};

// Team Member Roles
export const TEAM_ROLES = {
    COACH: 'COACH',
    PLAYER: 'PLAYER',
    PARENT: 'PARENT',
    MANAGER: 'MANAGER',
} as const;

// Event types
export const EVENT_TYPES = {
    PRACTICE: 'PRACTICE',
    GAME: 'GAME',
    MEETING: 'MEETING',
    OTHER: 'OTHER',
} as const;

export const EVENT_TYPE_LABELS: Record<string, string> = {
    PRACTICE: 'Practice',
    GAME: 'Game',
    MEETING: 'Meeting',
    OTHER: 'Other',
};

export const EVENT_TYPE_COLORS: Record<string, string> = {
    PRACTICE: '#3b82f6',
    GAME: '#ef4444',
    MEETING: '#f59e0b',
    OTHER: '#8b5cf6',
};

// RSVP statuses
export const RSVP_STATUSES = {
    GOING: 'GOING',
    MAYBE: 'MAYBE',
    NOT_GOING: 'NOT_GOING',
    PENDING: 'PENDING',
} as const;

// Invoice statuses
export const INVOICE_STATUSES = {
    PENDING: 'PENDING',
    PAID: 'PAID',
    OVERDUE: 'OVERDUE',
    CANCELLED: 'CANCELLED',
} as const;

// Navigation Items
export const NAV_ITEMS = [
    { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { label: 'Teams', href: '/teams', icon: '👥' },
    { label: 'Schedule', href: '/schedule', icon: '📅' },
    { label: 'Roster', href: '/roster', icon: '🏃' },
    { label: 'Chat', href: '/chat', icon: '💬' },
    { label: 'Payments', href: '/payments', icon: '💵' },
    { label: 'Settings', href: '/settings', icon: '⚙️' },
];

// Sports list
export const SPORTS = [
    'Soccer', 'Basketball', 'Baseball', 'Football', 'Hockey',
    'Volleyball', 'Tennis', 'Swimming', 'Track & Field', 'Lacrosse',
    'Softball', 'Wrestling', 'Golf', 'Gymnastics', 'Cheerleading',
    'Rugby', 'Cricket', 'Water Polo', 'Field Hockey', 'Other',
];
