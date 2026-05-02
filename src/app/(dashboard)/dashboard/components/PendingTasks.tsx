'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, CreditCard, CalendarClock, UserCog, ChevronRight } from 'lucide-react';

type Severity = 'high' | 'medium' | 'low';

interface PendingTask {
    id: string;
    type: 'invoice' | 'rsvp' | 'profile';
    title: string;
    description: string;
    count: number;
    severity: Severity;
    href: string;
}

const SEVERITY_COLORS: Record<Severity, string> = {
    high: 'var(--danger-500)',
    medium: 'var(--warning-500)',
    low: 'var(--primary-500)',
};

const TYPE_ICON: Record<PendingTask['type'], React.ComponentType<{ size?: number }>> = {
    invoice: CreditCard,
    rsvp: CalendarClock,
    profile: UserCog,
};

export default function PendingTasks() {
    const [tasks, setTasks] = useState<PendingTask[] | null>(null);

    useEffect(() => {
        fetch('/api/dashboard/tasks')
            .then((r) => r.json())
            .then((data) => {
                if (data.success) setTasks(data.data);
            })
            .catch(console.error);
    }, []);

    if (tasks === null) return null;

    return (
        <div className="card">
            <div className="card-header">
                <h2 className="card-title">Pending Tasks</h2>
            </div>
            {tasks.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 0' }}>
                    <div className="empty-state__icon"><CheckCircle2 size={28} /></div>
                    <p className="empty-state__description">All caught up. Nothing needs your attention right now.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tasks.map((task) => {
                        const Icon = TYPE_ICON[task.type] ?? AlertCircle;
                        const color = SEVERITY_COLORS[task.severity];
                        return (
                            <Link
                                key={task.id}
                                href={task.href}
                                className="card-interactive"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.875rem',
                                    padding: '0.625rem 0.75rem',
                                    borderRadius: 8,
                                    textDecoration: 'none',
                                    color: 'inherit',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        background: `color-mix(in srgb, ${color} 12%, transparent)`,
                                        color,
                                        flexShrink: 0,
                                    }}
                                >
                                    <Icon size={18} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{task.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                        {task.description}
                                    </div>
                                </div>
                                <ChevronRight size={16} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
