'use client';

import React, { ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';
import { NAV_ITEMS } from '@/lib/constants';
import {
  LayoutDashboard, Users, Calendar, ClipboardList,
  MessageCircle, CreditCard, Settings, Bell, Zap,
  BarChart3, Sparkles, Menu, LogOut, ChevronLeft, X, Sun, Moon,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

// Lucide icon map for nav items
const NAV_ICONS: Record<string, React.ReactElement> = {
  '/dashboard': <LayoutDashboard size={18} strokeWidth={1.75} />,
  '/teams':     <Users          size={18} strokeWidth={1.75} />,
  '/schedule':  <Calendar       size={18} strokeWidth={1.75} />,
  '/roster':    <ClipboardList  size={18} strokeWidth={1.75} />,
  '/chat':      <MessageCircle  size={18} strokeWidth={1.75} />,
  '/payments':  <CreditCard     size={18} strokeWidth={1.75} />,
  '/analytics':     <BarChart3  size={18} strokeWidth={1.75} />,
  '/practice-plan': <Sparkles  size={18} strokeWidth={1.75} />,
  '/settings':      <Settings  size={18} strokeWidth={1.75} />,
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  ADMIN: 'badge-role-admin',
  COACH: 'badge-role-coach',
  PLAYER: 'badge-role-player',
  PARENT: 'badge-role-parent',
};

function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: { mobileMenuOpen: boolean; setMobileMenuOpen: (v: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
            {/* Theme Toggle */}
            <button
              className="sidebar__icon-btn"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Notification Bell */}
            <div ref={panelRef} style={{ position: 'relative' }}>
              <button
                className="sidebar__icon-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={16} />
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
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft
                size={16}
                style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
              />
            </button>

            {/* Close (mobile) */}
            <button
              className="sidebar__icon-btn hide-desktop"
              onClick={() => setMobileMenuOpen(false)}
              title="Close"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Navigation Section Label */}
        {!collapsed && <div className="sidebar__section-label">Navigation</div>}

        {/* Navigation */}
        <nav className="sidebar__nav">
          {NAV_ITEMS.filter((item) => !item.roles || (user?.role && item.roles.includes(user.role))).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const icon = NAV_ICONS[item.href];
            const label = item.label === 'Teams' && (user?.role === 'PARENT' || user?.role === 'PLAYER') ? 'My Teams' : item.label;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                title={collapsed ? label : undefined}
              >
                {isActive && <span className="sidebar__link-bar" />}
                <span className="sidebar__link-icon">{icon}</span>
                {!collapsed && <span className="sidebar__link-label">{label}</span>}
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
                  {user.role && (
                    <span className={`badge ${ROLE_BADGE_CLASS[user.role] || 'badge-neutral'} sidebar__user-badge`}>
                      {user.role.toLowerCase()}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              className="sidebar__logout"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={15} />
              {!collapsed && <span>Log out</span>}
            </button>
          </div>
        )}

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
          padding: var(--space-4);
          background: rgba(10, 14, 26, 0.72);
          backdrop-filter: blur(22px) saturate(140%);
          -webkit-backdrop-filter: blur(22px) saturate(140%);
          border-bottom: 1px solid var(--sidebar-border, rgba(148, 163, 184, 0.08));
          position: sticky;
          top: 0;
          z-index: 30;
        }
        :global([data-theme="light"]) .mobile-header {
          background: rgba(255, 255, 255, 0.78);
        }
        .mobile-menu-btn {
          width: 40px;
          height: 40px;
          background: rgba(148, 163, 184, 0.06);
          border: 1px solid rgba(148, 163, 184, 0.10);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background var(--transition-fast);
        }
        .mobile-menu-btn:hover {
          background: rgba(148, 163, 184, 0.12);
        }
        .mobile-header-title {
          font-weight: var(--font-weight-extrabold);
          font-size: 1.1rem;
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: var(--space-2);
          background: var(--gradient-brand);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
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
