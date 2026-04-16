'use client';

import React, { ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth';
import { NAV_ITEMS } from '@/lib/constants';
import { Calendar, MessageCircle, CreditCard, Bell, Zap, Menu, X, ChevronLeft, LogOut } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

// SVG icon map for nav items
const NAV_SVG_ICONS: Record<string, React.ReactElement> = {
  '/dashboard': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  '/teams': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  '/schedule': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  '/roster': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  '/chat': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  '/payments': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  '/settings': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
};

function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: { mobileMenuOpen: boolean; setMobileMenuOpen: (v: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifications]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const getAvatarColor = (name: string) => {
    const colors = ['#3b82f6', '#14b8a6', '#8b5cf6', '#f59e0b', '#ef4444'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const notifIcon = (type: string) => {
    switch (type) {
      case 'NEW_EVENT': return <Calendar size={14} />;
      case 'NEW_MESSAGE': return <MessageCircle size={14} />;
      case 'INVOICE_DUE': return <CreditCard size={14} />;
      default: return <Bell size={14} />;
    }
  };

  return (
    <>
      {mobileMenuOpen && (
        <div className="sidebar-overlay hide-desktop" onClick={() => setMobileMenuOpen(false)} />
      )}
      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileMenuOpen ? 'sidebar--mobile-open' : ''}`}>

        {/* Header */}
        <div className="sidebar__header">
          <Link href="/dashboard" className="sidebar__logo">
            <div className="sidebar__logo-orb">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            {!collapsed && <span className="sidebar__logo-text">HuddleBase</span>}
          </Link>

          <div className="sidebar__header-actions">
            {/* Notification Bell */}
            <div ref={panelRef} style={{ position: 'relative' }}>
              <button
                className="sidebar__icon-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notifications"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span className="sidebar__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {showNotifications && (
                <div className="notif-panel">
                  <div className="notif-panel__header">
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button className="notif-panel__mark-read" onClick={markAllRead}>Mark all read</button>
                    )}
                  </div>
                  <div className="notif-panel__list">
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                        No notifications yet
                      </div>
                    ) : (
                      notifications.slice(0, 20).map((n) => (
                        <div
                          key={n.id}
                          className={`notif-item ${!n.read ? 'notif-item--unread' : ''}`}
                          onClick={async () => {
                            if (!n.read) {
                              try {
                                await fetch('/api/notifications', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ ids: [n.id] }),
                                });
                                setNotifications((prev) => prev.map((notif) => notif.id === n.id ? { ...notif, read: true } : notif));
                                setUnreadCount((c) => Math.max(0, c - 1));
                              } catch { /* silent */ }
                            }
                            if (n.link) router.push(n.link);
                            setShowNotifications(false);
                          }}
                        >
                          <span className="notif-item__icon">{notifIcon(n.type)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="notif-item__title">{n.title}</div>
                            <div className="notif-item__body">{n.body}</div>
                            <div className="notif-item__time">{timeAgo(n.createdAt)}</div>
                          </div>
                          {!n.read && <span className="notif-item__dot" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Collapse toggle (desktop) */}
            <button
              className="sidebar__icon-btn hide-mobile"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
              >
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>

            {/* Close (mobile) */}
            <button
              className="sidebar__icon-btn hide-desktop"
              onClick={() => setMobileMenuOpen(false)}
              title="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Section Label */}
        {!collapsed && <div className="sidebar__section-label">Navigation</div>}

        {/* Navigation */}
        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const icon = NAV_SVG_ICONS[item.href];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="sidebar__link-icon">{icon}</span>
                {!collapsed && (
                  <span className="sidebar__link-label">
                    {item.label === 'Teams' && (user?.role === 'PARENT' || user?.role === 'PLAYER') ? 'My Teams' : item.label}
                  </span>
                )}
                {isActive && !collapsed && <span className="sidebar__link-pip" />}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        {user && (
          <div className="sidebar__footer">
            <div className="sidebar__user">
              <div className="sidebar__avatar-wrap">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="sidebar__avatar" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="sidebar__avatar" style={{ background: getAvatarColor(user.name) }}>
                    {getInitials(user.name)}
                  </div>
                )}
                <span className="sidebar__avatar-status" />
              </div>
              {!collapsed && (
                <div className="sidebar__user-info">
                  <div className="sidebar__user-name">{user.name}</div>
                  <div className="sidebar__user-role">{user.role?.toLowerCase()}</div>
                </div>
              )}
            </div>
            <button
              className="sidebar__logout"
              onClick={handleLogout}
              title="Log out"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {!collapsed && <span>Log out</span>}
            </button>
          </div>
        )}

        <style jsx>{`
        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background: #111213;
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          z-index: 50;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar--collapsed {
          width: var(--sidebar-collapsed-width);
        }
        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(4px);
          z-index: 40;
          animation: fadeIn 0.2s ease;
        }

        /* Header */
        .sidebar__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.25rem;
          height: 70px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .sidebar__logo {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          text-decoration: none;
          white-space: nowrap;
          overflow: hidden;
          min-width: 0;
        }
        .sidebar__logo-orb {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: linear-gradient(135deg, #3b82f6, #14b8a6);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(59,130,246,0.35);
        }
        .sidebar__logo-text {
          font-size: 1.05rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #e2e8f0, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar__header-actions {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          flex-shrink: 0;
        }
        .sidebar__icon-btn {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--text-tertiary);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
          position: relative;
          flex-shrink: 0;
        }
        .sidebar__icon-btn:hover {
          background: rgba(255,255,255,0.07);
          color: var(--text-primary);
        }
        .sidebar__badge {
          position: absolute;
          top: 3px;
          right: 3px;
          background: #ef4444;
          color: white;
          font-size: 0.5rem;
          font-weight: 700;
          min-width: 14px;
          height: 14px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 2px;
          line-height: 1;
        }

        /* Section Label — hidden */
        .sidebar__section-label { display: none; }

        /* Nav */
        .sidebar__nav {
          flex: 1;
          padding: 1rem 0.875rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .sidebar__link {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 0.875rem;
          padding: 0.8rem 0.875rem;
          border-radius: 12px;
          color: #6b7280;
          font-size: 0.9375rem;
          font-weight: 600;
          transition: all 0.15s ease;
          position: relative;
          text-decoration: none;
          white-space: nowrap;
          overflow: hidden;
          line-height: 1;
        }
        .sidebar__link:hover {
          background: rgba(255,255,255,0.05);
          color: #9ca3af;
        }
        .sidebar__link--active {
          background: #252628;
          color: #f3f4f6;
          font-weight: 700;
        }
        .sidebar__link--active:hover {
          background: #2a2b2e;
          color: #f3f4f6;
        }
        .sidebar__link-icon {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          transition: color 0.15s;
        }
        .sidebar__link--active .sidebar__link-icon {
          color: #3b82f6;
        }
        .sidebar__link:hover .sidebar__link-icon {
          color: #9ca3af;
        }
        .sidebar__link-label {
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .sidebar__link-pip { display: none; }

        /* Footer */
        .sidebar__footer {
          padding: 0.75rem 0.625rem;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .sidebar__user {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.625rem;
          border-radius: 10px;
          transition: background 0.15s;
        }
        .sidebar__user:hover {
          background: rgba(255,255,255,0.04);
        }
        .sidebar__avatar-wrap {
          position: relative;
          flex-shrink: 0;
        }
        .sidebar__avatar {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          border: 2px solid rgba(255,255,255,0.12);
        }
        .sidebar__avatar-status {
          position: absolute;
          bottom: -1px;
          right: -1px;
          width: 9px;
          height: 9px;
          background: #22c55e;
          border-radius: 50%;
          border: 2px solid var(--surface-800);
        }
        .sidebar__user-info {
          overflow: hidden;
          flex: 1;
          min-width: 0;
        }
        .sidebar__user-name {
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar__user-role {
          font-size: 0.68rem;
          color: var(--text-tertiary);
          text-transform: capitalize;
          margin-top: 1px;
        }
        .sidebar__logout {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: none;
          background: transparent;
          color: var(--text-tertiary);
          font-size: 0.8rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .sidebar__logout:hover {
          background: rgba(239,68,68,0.08);
          color: #f87171;
        }

        /* Notification Panel */
        .notif-panel {
          position: absolute;
          top: 38px;
          left: 0;
          width: 340px;
          max-height: 440px;
          background: var(--surface-800);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          z-index: 100;
          overflow: hidden;
          animation: slideDown 0.15s ease;
        }
        .notif-panel__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .notif-panel__mark-read {
          background: none;
          border: none;
          color: var(--primary-400);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }
        .notif-panel__mark-read:hover { color: var(--primary-300); }
        .notif-panel__list { max-height: 380px; overflow-y: auto; }
        .notif-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .notif-item:hover { background: rgba(255,255,255,0.04); }
        .notif-item--unread { background: rgba(59,130,246,0.05); }
        .notif-item__icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 2px; }
        .notif-item__title { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
        .notif-item__body { font-size: 0.75rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .notif-item__time { font-size: 0.65rem; color: var(--text-tertiary); margin-top: 2px; }
        .notif-item__dot { width: 7px; height: 7px; border-radius: 50%; background: #3b82f6; flex-shrink: 0; margin-top: 6px; box-shadow: 0 0 5px rgba(59,130,246,0.6); }

        .hide-desktop { display: none !important; }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
            width: 280px !important;
          }
          .sidebar--mobile-open { transform: translateX(0); }
          .hide-mobile { display: none !important; }
          .hide-desktop { display: flex !important; }
        }
      `}</style>
      </aside>
    </>
  );
}

function DashboardContent({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--surface-900)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><Zap size={32} className="animate-pulse" /></div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading HuddleBase...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="dashboard-layout">
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main className="dashboard-main">
        {/* Mobile Header */}
        <div className="mobile-header hide-desktop">
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="mobile-header-title">
            <Zap size={18} />
            HuddleBase
          </div>
          <div style={{ width: 40 }} /> {/* spacer for flex alignment */}
        </div>
        <div className="dashboard-content-inner">
          {children}
        </div>
      </main>

      <style jsx>{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
          width: 100%;
        }
        .dashboard-main {
          flex: 1;
          margin-left: var(--sidebar-width);
          transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 100vh;
          background: var(--surface-900);
          display: flex;
          flex-direction: column;
          max-width: 100%;
        }
        .dashboard-content-inner {
          flex: 1;
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 100vw;
        }
        .mobile-header {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: var(--surface-800);
          border-bottom: 1px solid var(--surface-700);
          position: sticky;
          top: 0;
          z-index: 30;
        }
        .mobile-menu-btn {
          width: 40px;
          height: 40px;
          background: var(--surface-700);
          border: none;
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .mobile-header-title {
          font-weight: 800;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #3b82f6, #14b8a6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .hide-desktop {
          display: none !important;
        }

        @media (max-width: 768px) {
          .dashboard-main {
            margin-left: 0;
          }
          .mobile-header.hide-desktop {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  );
}
