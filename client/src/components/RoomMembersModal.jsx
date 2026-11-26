import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useSocket } from '../context/SocketContext';
import { X, Users, UserX, Shield } from 'lucide-react';

export const RoomMembersModal = ({ room, onClose }) => {
  const { user, isAdmin } = useAuth();
  const { adminRemoveUser } = useChat();
  const { isUserOnline } = useSocket();

  if (!room) return null;

  const handleRemoveMember = async (targetUserId, targetUsername) => {
    if (!window.confirm(`Are you sure you want to remove ${targetUsername} from "${room.name}"?`)) {
      return;
    }
    try {
      await adminRemoveUser(room._id, targetUserId);
    } catch (err) {
      alert(`Error removing member: ${err.message}`);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Users size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Room Members ({room.members?.length || 0})
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {room.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.25rem', maxHeight: '350px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {room.members?.map((member) => {
              const memberId = typeof member === 'string' ? member : member._id;
              const username = member.username || 'User';
              const avatar = member.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;
              const role = member.role || 'user';
              const isOnline = isUserOnline(memberId) || member.isOnline;
              const isCreator = (room.creator?._id || room.creator) === memberId;
              const isCurrentUser = user._id === memberId;

              return (
                <div
                  key={memberId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ position: 'relative' }}>
                      <img
                        src={avatar}
                        alt={username}
                        style={{ width: '34px', height: '34px', borderRadius: '50%' }}
                      />
                      <span
                        className={isOnline ? 'badge-online' : 'badge-offline'}
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          border: '2px solid var(--bg-tertiary)',
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                          {username} {isCurrentUser && '(You)'}
                        </span>
                        <span className={`badge ${role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                          {role}
                        </span>
                        {isCreator && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--warning)', fontWeight: 600 }}>
                            Creator
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {isOnline ? 'Active Now' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Admin RBAC: Admin can remove any user from room */}
                  {isAdmin && !isCurrentUser && (
                    <button
                      onClick={() => handleRemoveMember(memberId, username)}
                      className="btn btn-danger btn-sm"
                      title="Admin RBAC: Remove user from room"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <UserX size={14} />
                      Kick
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
