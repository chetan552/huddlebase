'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { getAvatarColor, getInitials, timeAgo } from '@/lib/utils';

interface Message {
    id: string;
    content: string;
    senderName: string;
    senderId: string;
    createdAt: string;
}

interface TeamChannel {
    id: string;
    name: string;
    color: string;
    lastMessage?: string;
}

export default function ChatPage() {
    const { user } = useAuth();
    const [teams, setTeams] = useState<TeamChannel[]>([]);
    const [activeTeam, setActiveTeam] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchTeams = async () => {
        try {
            const res = await fetch('/api/teams');
            const data = await res.json();
            if (data.success && data.data.length > 0) {
                setTeams(data.data);
                setActiveTeam(data.data[0].id);
            }
        } catch (err) { console.error(err); }
    };

    const fetchMessages = async (teamId: string) => {
        try {
            const res = await fetch(`/api/messages?teamId=${teamId}`);
            const data = await res.json();
            if (data.success) setMessages(data.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchTeams(); }, []);
    useEffect(() => {
        if (activeTeam) fetchMessages(activeTeam);
    }, [activeTeam]);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeTeam) return;
        setLoading(true);
        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId: activeTeam, content: newMessage }),
            });
            const data = await res.json();
            if (data.success) {
                setMessages((prev) => [...prev, data.data]);
                setNewMessage('');
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const activeTeamData = teams.find((t) => t.id === activeTeam);

    return (
        <div style={{ display: 'flex', height: 'calc(100vh)', overflow: 'hidden' }}>
            {/* Channel list */}
            <div style={{
                width: '260px', background: 'var(--surface-800)', borderRight: '1px solid var(--surface-700)',
                display: 'flex', flexDirection: 'column', flexShrink: 0,
            }}>
                <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--surface-700)' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>💬 Messages</h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                        Team channels
                    </p>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                    {teams.map((team) => (
                        <button
                            key={team.id}
                            onClick={() => setActiveTeam(team.id)}
                            style={{
                                width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center',
                                gap: '0.75rem', border: 'none', borderRadius: '0.625rem', cursor: 'pointer',
                                transition: 'all 0.2s', textAlign: 'left',
                                background: activeTeam === team.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                color: activeTeam === team.id ? 'var(--primary-400)' : 'var(--text-secondary)',
                            }}
                        >
                            <div style={{
                                width: 32, height: 32, borderRadius: '0.5rem', background: team.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                            }}>
                                {team.name.charAt(0)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {team.name}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Chat header */}
                <div style={{
                    padding: '1rem 1.5rem', borderBottom: '1px solid var(--surface-700)',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    background: 'var(--surface-800)',
                }}>
                    {activeTeamData && (
                        <>
                            <div style={{
                                width: 36, height: 36, borderRadius: '0.5rem', background: activeTeamData.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 700, fontSize: '0.9rem',
                            }}>
                                {activeTeamData.name.charAt(0)}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{activeTeamData.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Team Channel</div>
                            </div>
                        </>
                    )}
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    {!activeTeam ? (
                        <div className="empty-state">
                            <div className="empty-state__icon">💬</div>
                            <h3 className="empty-state__title">Select a Team</h3>
                            <p className="empty-state__description">Choose a team channel from the sidebar to start chatting.</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state__icon">👋</div>
                            <h3 className="empty-state__title">No Messages Yet</h3>
                            <p className="empty-state__description">Be the first to send a message in this channel!</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {messages.map((msg) => {
                                const isOwn = msg.senderId === user?.id;
                                return (
                                    <div key={msg.id} style={{
                                        display: 'flex', gap: '0.75rem',
                                        flexDirection: isOwn ? 'row-reverse' : 'row',
                                        alignItems: 'flex-start',
                                    }}>
                                        <div
                                            className="avatar avatar-sm"
                                            style={{ background: getAvatarColor(msg.senderName) }}
                                        >
                                            {getInitials(msg.senderName)}
                                        </div>
                                        <div style={{ maxWidth: '70%' }}>
                                            <div style={{
                                                fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem',
                                                textAlign: isOwn ? 'right' : 'left',
                                            }}>
                                                {msg.senderName} · {timeAgo(msg.createdAt)}
                                            </div>
                                            <div style={{
                                                padding: '0.75rem 1rem', borderRadius: '1rem',
                                                background: isOwn ? 'var(--primary-600)' : 'var(--surface-700)',
                                                color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.5,
                                                borderBottomRightRadius: isOwn ? '0.25rem' : '1rem',
                                                borderBottomLeftRadius: isOwn ? '1rem' : '0.25rem',
                                            }}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Message input */}
                {activeTeam && (
                    <form onSubmit={handleSend} style={{
                        padding: '1rem 1.5rem', borderTop: '1px solid var(--surface-700)',
                        display: 'flex', gap: '0.75rem', background: 'var(--surface-800)',
                    }}>
                        <input
                            className="form-input"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !newMessage.trim()}
                        >
                            Send
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
