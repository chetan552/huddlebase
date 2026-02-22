'use client';

import { ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth';
import { NAV_ITEMS } from '@/lib/constants';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

function Sidebar() {
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

  // Close panel when clicking outside
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
      case 'NEW_EVENT': return '📅';
      case 'NEW_MESSAGE': return '💬';
      case 'INVOICE_DUE': return '💳';
      default: return '🔔';
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar__header">
        <Link href="/dashboard" className="sidebar__logo">
          <span className="sidebar__logo-icon">⚡</span>
          {!collapsed && <span className="sidebar__logo-text">HuddleBase</span>}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {/* Notification Bell */}
          <div ref={panelRef} style={{ position: 'relative' }}>
            <button
              className="sidebar__toggle"
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
              style={{ position: 'relative' }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#ef4444', color: 'white', fontSize: '0.6rem',
                  fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px',
                }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {/* Notification Panel */}
            {showNotifications && (
              <div className="notif-panel">
                <div className="notif-panel__header">
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button className="notif-panel__mark-read" onClick={markAllRead}>
                      Mark all read
                    </button>
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
          <button
            className="sidebar__toggle"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar__link-icon" style={{ marginRight: '0.5rem' }}>{item.icon}</span>
              {!collapsed && (
                <span className="sidebar__link-label">
                  {item.label === 'Teams' && (user?.role === 'PARENT' || user?.role === 'PLAYER') ? 'My Teams' : item.label}
                </span>
              )}
              {isActive && <span className="sidebar__link-indicator" />}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      {user && (
        <div className="sidebar__footer">
          <div className="sidebar__user">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="sidebar__avatar"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div
                className="sidebar__avatar"
                style={{ background: getAvatarColor(user.name) }}
              >
                {getInitials(user.name)}
              </div>
            )}
            {!collapsed && (
              <div className="sidebar__user-info">
                <div className="sidebar__user-name">{user.name}</div>
                <div className="sidebar__user-role">{user.role}</div>
              </div>
            )}
          </div>
          <button
            className="sidebar__logout"
            onClick={handleLogout}
            title="Log out"
          >
            {collapsed ? '🚪' : 'Log out'}
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
          background: var(--surface-800);
          border-right: 1px solid var(--surface-700);
          display: flex;
          flex-direction: column;
          z-index: 50;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar--collapsed {
          width: var(--sidebar-collapsed-width);
        }
        .sidebar__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid var(--surface-700);
          min-height: 64px;
        }
        .sidebar__logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          white-space: nowrap;
          overflow: hidden;
        }
        .sidebar__logo-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        .sidebar__logo-text {
          font-size: 1.15rem;
          font-weight: 800;
          background: linear-gradient(135deg, #3b82f6, #14b8a6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .sidebar__toggle {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: var(--surface-700);
          color: var(--text-secondary);
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.75rem;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .sidebar__toggle:hover {
          background: var(--surface-600);
          color: var(--text-primary);
        }
        .sidebar__nav {
          flex: 1;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .sidebar__link {
          display: flex;
          align-items: center;
          gap: 0;
          padding: 0.625rem 0.75rem;
          border-radius: 0.625rem;
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
          position: relative;
          text-decoration: none;
          white-space: nowrap;
        }
        .sidebar__link:hover {
          background: var(--surface-700);
          color: var(--text-primary);
        }
        .sidebar__link--active {
          background: rgba(59, 130, 246, 0.1);
          color: var(--primary-400);
        }
        .sidebar__link-icon {
          font-size: 1.15rem;
          flex-shrink: 0;
          width: 24px;
          text-align: center;
        }
        .sidebar__link-label {
          overflow: hidden;
        }
        .sidebar__link-indicator {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: var(--primary-500);
          border-radius: 0 3px 3px 0;
        }
        .sidebar__footer {
          padding: 0.75rem;
          border-top: 1px solid var(--surface-700);
        }
        .sidebar__user {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .sidebar__avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .sidebar__user-info {
          overflow: hidden;
        }
        .sidebar__user-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar__user-role {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          text-transform: capitalize;
        }
        .sidebar__logout {
          width: 100%;
          padding: 0.5rem;
          border: none;
          background: transparent;
          color: var(--text-tertiary);
          font-size: 0.8rem;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sidebar__logout:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger-400);
        }
        /* Notification Panel */
        .notif-panel {
          position: absolute;
          top: 36px;
          left: 0;
          width: 340px;
          max-height: 440px;
          background: var(--surface-800);
          border: 1px solid var(--surface-600);
          border-radius: 0.75rem;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          z-index: 100;
          overflow: hidden;
          animation: slideDown 0.15s ease;
        }
        .notif-panel__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--surface-700);
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
        .notif-panel__list {
          max-height: 380px;
          overflow-y: auto;
        }
        .notif-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid var(--surface-700);
        }
        .notif-item:hover { background: var(--surface-700); }
        .notif-item--unread { background: rgba(59, 130, 246, 0.05); }
        .notif-item__icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 2px; }
        .notif-item__title {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        .notif-item__body {
          font-size: 0.75rem;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .notif-item__time {
          font-size: 0.65rem;
          color: var(--text-tertiary);
          margin-top: 2px;
        }
        .notif-item__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--primary-500);
          flex-shrink: 0;
          margin-top: 6px;
        }
      `}</style>
    </aside>
  );
}

function DashboardContent({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚡</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading HuddleBase...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        {children}
      </main>

      <style jsx>{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
        }
        .dashboard-main {
          flex: 1;
          margin-left: var(--sidebar-width);
          transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 100vh;
          background: var(--surface-900);
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
