'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getAvatarColor, getInitials, timeAgo } from '@/lib/utils';
import { MessageCircle, Send, ChevronLeft, Plus, X, Check, CheckCheck, BellOff, Bell, SmilePlus } from 'lucide-react';

interface Reaction {
    emoji: string;
    count: number;
    reacted: boolean;
}

interface Message {
    id: string;
    content: string | null;
    deleted?: boolean;
    senderName: string;
    senderId: string;
    senderAvatar?: string | null;
    createdAt: string;
    editedAt?: string | null;
    reactions: Reaction[];
    readBy: { id: string; name: string }[];
}

interface Participant {
    id: string;
    name: string;
    avatar: string | null;
}

interface Conversation {
    id: string;
    type: 'TEAM' | 'DIRECT' | 'GROUP';
    title: string;
    teamId: string | null;
    teamName: string | null;
    teamColor: string | null;
    participants: Participant[];
    unreadCount: number;
    muted: boolean;
    lastMessage: { content: string; senderName: string; createdAt: string } | null;
    lastMessageAt: string;
}

const QUICK_REACTIONS = ['👍', '🔥', '👏', '❤️', '😂', '🎉'];

function ChatPageInner() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(true);
    const [showNewChat, setShowNewChat] = useState(false);
    const [reactingTo, setReactingTo] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const active = conversations.find((c) => c.id === activeId) ?? null;

    const fetchConversations = useCallback(async () => {
        try {
            const res = await fetch('/api/conversations');
            const data = await res.json();
            if (data.success) setConversations(data.data);
            return data.success ? (data.data as Conversation[]) : [];
        } catch {
            return [];
        }
    }, []);

    const fetchMessages = useCallback(async (conversationId: string) => {
        try {
            const res = await fetch(`/api/conversations/${conversationId}/messages`);
            const data = await res.json();
            if (data.success) setMessages(data.data);
        } catch { /* transient; the poll will retry */ }
    }, []);

    // Opening a conversation clears its badge both locally and on the server.
    const markRead = useCallback(async (conversationId: string) => {
        setConversations((prev) =>
            prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
        );
        try {
            await fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' });
        } catch { /* badge will correct on next poll */ }
    }, []);

    useEffect(() => {
        fetchConversations().then((list) => {
            const requested = searchParams.get('conversation');
            const initial = requested && list.some((c) => c.id === requested) ? requested : list[0]?.id;
            if (initial) setActiveId(initial);
            if (requested) setShowMobileSidebar(false);
        });
    }, [fetchConversations, searchParams]);

    useEffect(() => {
        if (!activeId) return;
        fetchMessages(activeId);
        markRead(activeId);
    }, [activeId, fetchMessages, markRead]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Poll both the open thread and the sidebar so unread badges stay live.
    useEffect(() => {
        const interval = setInterval(() => {
            if (activeId) fetchMessages(activeId);
            fetchConversations();
        }, 5000);
        return () => clearInterval(interval);
    }, [activeId, fetchMessages, fetchConversations]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeId) return;
        setSending(true);
        const content = newMessage;
        setNewMessage('');
        try {
            const res = await fetch(`/api/conversations/${activeId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });
            const data = await res.json();
            if (data.success) {
                setMessages((prev) => [...prev, data.data]);
                fetchConversations();
            } else {
                setNewMessage(content); // restore so the text isn't lost
            }
        } catch {
            setNewMessage(content);
        }
        setSending(false);
    };

    const toggleReaction = async (messageId: string, emoji: string) => {
        setReactingTo(null);
        // Optimistic: reactions are trivial to reconcile on the next poll.
        setMessages((prev) =>
            prev.map((m) => {
                if (m.id !== messageId) return m;
                const existing = m.reactions.find((r) => r.emoji === emoji);
                if (!existing) return { ...m, reactions: [...m.reactions, { emoji, count: 1, reacted: true }] };
                const count = existing.reacted ? existing.count - 1 : existing.count + 1;
                const reactions = count === 0
                    ? m.reactions.filter((r) => r.emoji !== emoji)
                    : m.reactions.map((r) => (r.emoji === emoji ? { ...r, count, reacted: !r.reacted } : r));
                return { ...m, reactions };
            }),
        );
        try {
            await fetch(`/api/messages/${messageId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emoji }),
            });
        } catch { /* reconciled by poll */ }
    };

    const toggleMute = async () => {
        if (!active) return;
        const muted = !active.muted;
        setConversations((prev) => prev.map((c) => (c.id === active.id ? { ...c, muted } : c)));
        try {
            await fetch(`/api/conversations/${active.id}/read`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ muted }),
            });
        } catch { /* reconciled by poll */ }
    };

    const avatarFor = (c: Conversation) => {
        if (c.type === 'TEAM') return { label: c.title.charAt(0), color: c.teamColor ?? '#3b82f6' };
        if (c.type === 'GROUP') return { label: c.title.charAt(0), color: '#8b5cf6' };
        const other = c.participants.find((p) => p.id !== user?.id);
        return { label: getInitials(other?.name ?? c.title), color: getAvatarColor(other?.name ?? c.title) };
    };

    return (
        <div className="chat-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100%' }}>
            {/* Conversation list */}
            <div
                className={`chat-sidebar chat-sidebar-glass ${showMobileSidebar ? 'chat-sidebar-mobile-visible' : 'chat-sidebar-mobile-hidden'}`}
                style={{ width: '280px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}
            >
                <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid rgba(148, 163, 184, 0.08)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <MessageCircle size={20} color="var(--primary-400)" />
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Messages</h2>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.125rem' }}>
                            Teams &amp; direct messages
                        </p>
                    </div>
                    <button
                        onClick={() => setShowNewChat(true)}
                        aria-label="New conversation"
                        style={{ width: 32, height: 32, border: 'none', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary-400)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Plus size={16} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                    {conversations.map((c) => {
                        const isActive = activeId === c.id;
                        const { label, color } = avatarFor(c);
                        return (
                            <button
                                key={c.id}
                                onClick={() => { setActiveId(c.id); setShowMobileSidebar(false); }}
                                style={{
                                    width: '100%', padding: '0.625rem 0.75rem', display: 'flex', alignItems: 'center',
                                    gap: '0.75rem', border: '1px solid transparent', borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer', transition: 'all var(--transition-fast)', textAlign: 'left',
                                    background: isActive
                                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(20, 184, 166, 0.10))'
                                        : 'transparent',
                                    borderColor: isActive ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    boxShadow: isActive ? '0 4px 14px rgba(59, 130, 246, 0.12)' : 'none',
                                }}
                            >
                                <div style={{
                                    width: 32, height: 32, borderRadius: c.type === 'DIRECT' ? '50%' : '0.5rem',
                                    background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
                                }}>
                                    {label}
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        {c.title}
                                        {c.muted && <BellOff size={11} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
                                    </div>
                                    {c.lastMessage && (
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {c.lastMessage.senderName}: {c.lastMessage.content}
                                        </div>
                                    )}
                                </div>
                                {c.unreadCount > 0 && (
                                    <span style={{
                                        minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
                                        background: 'var(--primary-500, #3b82f6)', color: 'white',
                                        fontSize: '0.65rem', fontWeight: 700, display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}>
                                        {c.unreadCount > 99 ? '99+' : c.unreadCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Thread */}
            <div className={`chat-main ${!showMobileSidebar ? 'chat-main-mobile-visible' : 'chat-main-mobile-hidden'}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div className="chat-header-glass" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        className="mobile-back-btn"
                        aria-label="Back to conversations"
                        onClick={() => setShowMobileSidebar(true)}
                        style={{ width: 36, height: 36, border: 'none', borderRadius: 'var(--radius-md)', background: 'rgba(148, 163, 184, 0.08)', color: 'var(--text-primary)', cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    {active && (
                        <>
                            <div style={{
                                width: 36, height: 36, borderRadius: active.type === 'DIRECT' ? '50%' : '0.5rem',
                                background: avatarFor(active).color, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem',
                            }}>
                                {avatarFor(active).label}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{active.title}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                    {active.type === 'TEAM' && 'Team channel · everyone on the roster'}
                                    {active.type === 'DIRECT' && 'Direct message'}
                                    {active.type === 'GROUP' && `Group · ${active.participants.length} members`}
                                </div>
                            </div>
                            <button
                                onClick={toggleMute}
                                aria-label={active.muted ? 'Unmute conversation' : 'Mute conversation'}
                                title={active.muted ? 'Unmute' : 'Mute notifications'}
                                style={{ width: 34, height: 34, border: 'none', borderRadius: 'var(--radius-md)', background: 'rgba(148, 163, 184, 0.08)', color: active.muted ? 'var(--text-tertiary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                {active.muted ? <BellOff size={16} /> : <Bell size={16} />}
                            </button>
                        </>
                    )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    {!activeId ? (
                        <div className="empty-state">
                            <div className="empty-state__icon"><MessageCircle /></div>
                            <h3 className="empty-state__title">Select a conversation</h3>
                            <p className="empty-state__description">Choose a team channel or direct message to start chatting.</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state__icon"><MessageCircle /></div>
                            <h3 className="empty-state__title">No messages yet</h3>
                            <p className="empty-state__description">Be the first to say something.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {messages.map((msg, index) => {
                                const isOwn = msg.senderId === user?.id;
                                const isLastOwn = isOwn && index === messages.length - 1;
                                return (
                                    <div key={msg.id} style={{ display: 'flex', gap: '0.75rem', flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                                        <div className="avatar avatar-sm" style={{ background: getAvatarColor(msg.senderName) }}>
                                            {getInitials(msg.senderName)}
                                        </div>
                                        <div style={{ maxWidth: '70%', minWidth: 0 }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem', textAlign: isOwn ? 'right' : 'left' }}>
                                                {msg.senderName} · {timeAgo(msg.createdAt)}
                                                {msg.editedAt && ' · edited'}
                                            </div>

                                            <div style={{ position: 'relative' }}>
                                                <div
                                                    className={isOwn ? '' : 'msg-bubble-other'}
                                                    onDoubleClick={() => setReactingTo(reactingTo === msg.id ? null : msg.id)}
                                                    style={{
                                                        padding: '0.625rem 0.875rem', borderRadius: '1rem',
                                                        background: isOwn ? 'var(--gradient-brand)' : undefined,
                                                        color: msg.deleted ? 'var(--text-tertiary)' : isOwn ? 'white' : 'var(--text-primary)',
                                                        fontSize: '0.9rem', lineHeight: 1.5,
                                                        fontStyle: msg.deleted ? 'italic' : undefined,
                                                        boxShadow: isOwn ? '0 6px 18px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)' : undefined,
                                                        borderBottomRightRadius: isOwn ? '0.25rem' : '1rem',
                                                        borderBottomLeftRadius: isOwn ? '1rem' : '0.25rem',
                                                        wordBreak: 'break-word',
                                                    }}
                                                >
                                                    {msg.deleted ? 'This message was deleted' : msg.content}
                                                </div>

                                                {!msg.deleted && (
                                                    <button
                                                        onClick={() => setReactingTo(reactingTo === msg.id ? null : msg.id)}
                                                        aria-label="Add reaction"
                                                        style={{
                                                            position: 'absolute', top: -6, [isOwn ? 'left' : 'right']: -6,
                                                            width: 22, height: 22, borderRadius: '50%', border: 'none',
                                                            background: 'var(--bg-elevated, rgba(30,41,59,0.95))',
                                                            color: 'var(--text-tertiary)', cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.25)', opacity: 0.75,
                                                        } as React.CSSProperties}
                                                    >
                                                        <SmilePlus size={12} />
                                                    </button>
                                                )}

                                                {reactingTo === msg.id && (
                                                    <div style={{
                                                        position: 'absolute', top: -40, [isOwn ? 'right' : 'left']: 0,
                                                        display: 'flex', gap: '0.15rem', padding: '0.3rem',
                                                        background: 'var(--bg-elevated, rgba(30,41,59,0.98))',
                                                        borderRadius: 'var(--radius-md)', zIndex: 10,
                                                        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                                                        border: '1px solid rgba(148,163,184,0.12)',
                                                    } as React.CSSProperties}>
                                                        {QUICK_REACTIONS.map((emoji) => (
                                                            <button
                                                                key={emoji}
                                                                onClick={() => toggleReaction(msg.id, emoji)}
                                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1rem', padding: '0.15rem 0.25rem', borderRadius: '0.35rem', lineHeight: 1 }}
                                                            >
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {msg.reactions.length > 0 && (
                                                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.35rem', flexWrap: 'wrap', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                                                    {msg.reactions.map((r) => (
                                                        <button
                                                            key={r.emoji}
                                                            onClick={() => toggleReaction(msg.id, r.emoji)}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '0.2rem',
                                                                padding: '0.1rem 0.4rem', borderRadius: 10, cursor: 'pointer',
                                                                fontSize: '0.72rem',
                                                                background: r.reacted ? 'rgba(59,130,246,0.2)' : 'rgba(148,163,184,0.1)',
                                                                border: `1px solid ${r.reacted ? 'rgba(59,130,246,0.4)' : 'transparent'}`,
                                                                color: 'var(--text-secondary)',
                                                            }}
                                                        >
                                                            <span>{r.emoji}</span>
                                                            <span style={{ fontWeight: 600 }}>{r.count}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Read receipt on your most recent message only, to avoid clutter. */}
                                            {isLastOwn && (
                                                <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '0.3rem', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                                    {msg.readBy.length > 0 ? (
                                                        <>
                                                            <CheckCheck size={12} />
                                                            {active?.type === 'DIRECT'
                                                                ? 'Read'
                                                                : `Read by ${msg.readBy.length}`}
                                                        </>
                                                    ) : (
                                                        <><Check size={12} /> Sent</>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {activeId && (
                    <form onSubmit={handleSend} className="chat-composer-glass" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.75rem' }}>
                        <input
                            className="form-input"
                            placeholder="Type a message…"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button type="submit" className="btn btn-primary" disabled={sending || !newMessage.trim()} aria-label="Send message">
                            <Send size={16} />
                        </button>
                    </form>
                )}
            </div>

            {showNewChat && (
                <NewConversationModal
                    onClose={() => setShowNewChat(false)}
                    onCreated={async (id) => {
                        setShowNewChat(false);
                        await fetchConversations();
                        setActiveId(id);
                        setShowMobileSidebar(false);
                    }}
                />
            )}
        </div>
    );
}

interface RosterPerson {
    id: string;
    name: string;
    role: string;
    teamName?: string;
}

function NewConversationModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
    const { user } = useAuth();
    const [people, setPeople] = useState<RosterPerson[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');
    const [search, setSearch] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/roster');
                const data = await res.json();
                if (data.success) {
                    const seen = new Set<string>();
                    const unique: RosterPerson[] = [];
                    for (const m of data.data) {
                        const id = m.userId ?? m.id;
                        if (id === user?.id || seen.has(id)) continue;
                        seen.add(id);
                        unique.push({ id, name: m.name, role: m.role, teamName: m.teamName });
                    }
                    setPeople(unique);
                }
            } catch { setError('Could not load your teammates.'); }
        })();
    }, [user?.id]);

    const create = async () => {
        if (selected.length === 0) return;
        setBusy(true);
        setError('');
        try {
            // One person is a direct thread; more than one becomes a named group.
            const body = selected.length === 1
                ? { type: 'DIRECT', userId: selected[0] }
                : { type: 'GROUP', userIds: selected, name: groupName.trim() || 'Group chat' };
            const res = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) onCreated(data.data.id);
            else setError(data.error || 'Could not start that conversation.');
        } catch {
            setError('Something went wrong. Try again.');
        }
        setBusy(false);
    };

    const filtered = people.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
                <div className="modal-header">
                    <h3 className="modal-title">New conversation</h3>
                    <button onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close"><X size={16} /></button>
                </div>
                <div className="modal-body">
                    {error && <div className="form-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

                    <div className="form-group">
                        <label className="form-label">Search teammates</label>
                        <input className="form-input" placeholder="Name…" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>

                    {selected.length > 1 && (
                        <div className="form-group">
                            <label className="form-label">Group name</label>
                            <input className="form-input" placeholder="e.g. Team parents" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
                        </div>
                    )}

                    <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {filtered.length === 0 && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', padding: '0.5rem' }}>
                                No teammates found. You can message anyone who shares a team with you.
                            </p>
                        )}
                        {filtered.map((p) => {
                            const checked = selected.includes(p.id);
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => setSelected((prev) => checked ? prev.filter((id) => id !== p.id) : [...prev, p.id])}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0.6rem',
                                        borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', width: '100%',
                                        background: checked ? 'rgba(59,130,246,0.15)' : 'transparent',
                                        border: `1px solid ${checked ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    <div className="avatar avatar-sm" style={{ background: getAvatarColor(p.name) }}>{getInitials(p.name)}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                            {p.role}{p.teamName ? ` · ${p.teamName}` : ''}
                                        </div>
                                    </div>
                                    {checked && <Check size={15} color="var(--primary-400)" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={create} disabled={busy || selected.length === 0}>
                        {selected.length > 1 ? `Create group (${selected.length})` : 'Start chat'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ChatPage() {
    // useSearchParams needs a Suspense boundary during prerender.
    return (
        <Suspense fallback={<div className="page-content" />}>
            <ChatPageInner />
        </Suspense>
    );
}
