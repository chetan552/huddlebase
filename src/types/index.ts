/**
 * HuddleBase Type Definitions
 */

export type UserRole = 'ADMIN' | 'COACH' | 'PARENT' | 'PLAYER';
export type TeamMemberRole = 'COACH' | 'PLAYER' | 'PARENT' | 'MANAGER';
export type EventType = 'PRACTICE' | 'GAME' | 'MEETING' | 'OTHER';
export type RSVPStatus = 'GOING' | 'MAYBE' | 'NOT_GOING' | 'PENDING';
export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentMethod = 'MANUAL' | 'STRIPE' | 'CHECK' | 'CASH';
export type AnnouncementPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

// Session user (slim version for auth context)
export interface SessionUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    avatar?: string;
}

// Team with member count (for listing)
export interface TeamSummary {
    id: string;
    name: string;
    sport: string;
    season: string | null;
    color: string;
    logo: string | null;
    memberCount: number;
    upcomingEventCount: number;
}

// Event with RSVP summary
export interface EventWithRSVP {
    id: string;
    teamId: string;
    teamName: string;
    title: string;
    type: EventType;
    description: string | null;
    location: string | null;
    startTime: string;
    endTime: string | null;
    isCancelled: boolean;
    rsvpCounts: {
        going: number;
        maybe: number;
        notGoing: number;
        pending: number;
    };
    userRsvp?: RSVPStatus;
}

// Dashboard stats
export interface DashboardStats {
    totalTeams: number;
    totalPlayers: number;
    upcomingEvents: number;
    pendingRsvps: number;
    outstandingPayments: number;
    totalRevenue: number;
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
