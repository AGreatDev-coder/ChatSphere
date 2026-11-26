import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { MessageSquare, Shield, LogOut, Radio, User } from 'lucide-react';

export const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();
  const { isConnected } = useSocket();
  const location = useLocation();

  if (!user) return null;

  return (
    <header style={{
      backgroundColor: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 2px 10px rgba(99, 102, 241, 0.4)',
        }}>
          <MessageSquare size={20} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em', color: '#fff' }}>
              ChatSphere
            </span>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.68rem',
              color: isConnected ? 'var(--success)' : 'var(--text-muted)',
              backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
              padding: '2px 6px',
              borderRadius: '999px',
              border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(100, 116, 139, 0.2)'}`,
            }}>
              <Radio size={10} />
              {isConnected ? 'Real-Time' : 'Connecting...'}
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Real-Time Chat & Rooms
          </p>
        </div>
      </div>

      {/* Navigation & User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            color: location.pathname === '/' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.875rem',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: location.pathname === '/' ? 'var(--bg-tertiary)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
          }}
        >
          <MessageSquare size={16} />
          Chats
        </Link>

        {isAdmin && (
          <Link
            to="/admin"
            style={{
              textDecoration: 'none',
              color: location.pathname === '/admin' ? '#c4b5fd' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: location.pathname === '/admin' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
              border: location.pathname === '/admin' ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s',
            }}
          >
            <Shield size={16} color="#8b5cf6" />
            Admin Panel
          </Link>
        )}

        {/* User Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.35rem 0.75rem',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}>
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
            alt={user.username}
            style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2d3348' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                {user.username}
              </span>
              <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                {user.role}
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.email}</span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          title="Sign out of ChatSphere"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </header>
  );
};
