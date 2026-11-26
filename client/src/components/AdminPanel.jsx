import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useChat } from '../context/ChatContext';
import {
  Shield,
  Users,
  MessageSquare,
  Activity,
  Trash2,
  UserCheck,
  UserX,
  RefreshCw,
  Hash,
  Terminal,
} from 'lucide-react';

export const AdminPanel = () => {
  const { adminDeleteRoom, fetchRooms } = useChat();

  const [stats, setStats] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [roomsList, setRoomsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, roomsRes] = await Promise.all([
        api.admin.getStats(),
        api.admin.getAllUsers(),
        api.admin.getAllRooms(),
      ]);

      if (statsRes.success) {
        setStats(statsRes.stats);
        setRecentEvents(statsRes.recentEvents || []);
      }
      if (usersRes.success) {
        setUsersList(usersRes.users);
      }
      if (roomsRes.success) {
        setRoomsList(roomsRes.rooms);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleDeleteRoom = async (roomId, roomName) => {
    if (!window.confirm(`[Admin RBAC] Are you sure you want to delete room "${roomName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await adminDeleteRoom(roomId);
      setMessage(`Room "${roomName}" deleted successfully.`);
      loadAdminData();
    } catch (err) {
      alert(`Failed to delete room: ${err.message}`);
    }
  };

  const handleToggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await api.admin.updateUserRole(userId, newRole);
      setMessage(`User role updated to ${newRole}.`);
      loadAdminData();
    } catch (err) {
      alert(`Failed to update role: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`[Admin RBAC] Are you sure you want to delete user "${username}"?`)) {
      return;
    }
    try {
      await api.admin.deleteUser(userId);
      setMessage(`User "${username}" deleted successfully.`);
      loadAdminData();
    } catch (err) {
      alert(`Failed to delete user: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', overflowY: 'auto' }}>
      {/* Title & Refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
            color: '#c4b5fd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(139, 92, 246, 0.4)',
          }}>
            <Shield size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
              Admin Control Center
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Role-Based Access Control (RBAC) & Node.js EventEmitter System Monitoring
            </p>
          </div>
        </div>

        <button
          onClick={loadAdminData}
          className="btn btn-secondary btn-sm"
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {message && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          color: 'var(--success)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{message}</span>
          <button
            onClick={() => setMessage('')}
            style={{ background: 'transparent', border: 'none', color: 'var(--success)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI STATS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div style={{
          padding: '1.25rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Registered Users</span>
            <Users size={18} color="var(--accent-primary)" />
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}>
            {stats ? stats.totalUsers : '-'}
          </p>
        </div>

        <div style={{
          padding: '1.25rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Chat Rooms</span>
            <Hash size={18} color="var(--warning)" />
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}>
            {stats ? stats.totalRooms : '-'}
          </p>
        </div>

        <div style={{
          padding: '1.25rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Messages Saved</span>
            <MessageSquare size={18} color="var(--success)" />
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}>
            {stats ? stats.totalMessages : '-'}
          </p>
        </div>

        <div style={{
          padding: '1.25rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active Online Now</span>
            <Activity size={18} color="var(--success)" />
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.5rem' }}>
            {stats ? stats.onlineUsers : '-'}
          </p>
        </div>
      </div>

      {/* NODE.JS EVENTEMITTER AUDIT LOG */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        padding: '1.25rem',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Terminal size={18} color="#c4b5fd" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
            Node.js EventEmitter Server Event Log
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            (Live server events: user connected, message saved, room actions)
          </span>
        </div>

        <div style={{
          maxHeight: '220px',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
        }}>
          {recentEvents.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
              No server events captured yet.
            </p>
          ) : (
            recentEvents.map((evt) => (
              <div
                key={evt.id}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.75rem',
                  padding: '0.35rem 0',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', flexShrink: 0 }}>
                  [{new Date(evt.timestamp).toLocaleTimeString()}]
                </span>
                <span style={{
                  color: evt.type.startsWith('user') ? 'var(--success)' : evt.type.startsWith('message') ? '#93c5fd' : 'var(--warning)',
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                  {evt.type}
                </span>
                <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {JSON.stringify(evt.payload)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ROOMS MANAGEMENT TABLE */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        padding: '1.25rem',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Hash size={18} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
            Room Management (RBAC: Admin Can Delete Any Room)
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.65rem' }}>Room Name</th>
                <th style={{ padding: '0.65rem' }}>Type</th>
                <th style={{ padding: '0.65rem' }}>Members</th>
                <th style={{ padding: '0.65rem' }}>Creator</th>
                <th style={{ padding: '0.65rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roomsList.map((room) => (
                <tr key={room._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: '#fff' }}>
                    {room.name}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge ${room.isGroup ? 'badge-user' : 'badge-admin'}`}>
                      {room.isGroup ? 'Group Room' : 'Direct Chat'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                    {room.members?.length || 0} members
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                    {room.creator?.username || 'System/Admin'}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDeleteRoom(room._id, room.name)}
                      className="btn btn-danger btn-sm"
                      title="Admin RBAC: Delete Room"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* USERS MANAGEMENT TABLE */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        padding: '1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Users size={18} color="var(--success)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
            User Management (RBAC: Admin Can Manage Roles & Remove Users)
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.65rem' }}>User</th>
                <th style={{ padding: '0.65rem' }}>Email</th>
                <th style={{ padding: '0.65rem' }}>Role</th>
                <th style={{ padding: '0.65rem' }}>Status</th>
                <th style={{ padding: '0.65rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img
                      src={u.avatar}
                      alt={u.username}
                      style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                    />
                    {u.username}
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                    {u.email}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
                      <span className={u.isOnline ? 'badge-online' : 'badge-offline'} />
                      {u.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleToggleUserRole(u._id, u.role)}
                        className="btn btn-secondary btn-sm"
                        title="Toggle role user/admin"
                      >
                        <UserCheck size={13} />
                        {u.role === 'admin' ? 'Make User' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u._id, u.username)}
                        className="btn btn-danger btn-sm"
                        title="Admin RBAC: Remove User"
                      >
                        <UserX size={13} />
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
