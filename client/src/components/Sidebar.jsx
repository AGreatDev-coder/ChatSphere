import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Hash,
  MessageCircle,
  Plus,
  Compass,
  Search,
  Users,
  Circle,
} from 'lucide-react';
import { CreateRoomModal } from './CreateRoomModal';
import { DirectMessageModal } from './DirectMessageModal';
import { AvailableRoomsModal } from './AvailableRoomsModal';

export const Sidebar = () => {
  const { user } = useAuth();
  const { rooms, activeRoom, selectRoom, unreadCounts, loadingRooms } = useChat();
  const { isUserOnline } = useSocket();

  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [showAvailableModal, setShowAvailableModal] = useState(false);

  // Filter rooms into Group Rooms and Direct Chats
  const groupRooms = rooms.filter((r) => r.isGroup);
  const directRooms = rooms.filter((r) => !r.isGroup);

  const getDirectChatInfo = (room) => {
    const otherMember = room.members?.find(
      (m) => (typeof m === 'string' ? m : m._id) !== user?._id
    );
    const username = otherMember?.username || 'Private Chat';
    const avatar = otherMember?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;
    const online = otherMember ? isUserOnline(otherMember._id || otherMember) : false;
    return { username, avatar, online, memberId: otherMember?._id || otherMember };
  };

  const matchesSearch = (name) =>
    name.toLowerCase().includes(search.toLowerCase());

  return (
    <aside style={{
      width: '320px',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 61px)',
    }}>
      {/* Search & Actions Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.1rem', fontSize: '0.8rem', padding: '0.5rem 0.5rem 0.5rem 2.1rem' }}
            placeholder="Search rooms or chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.4rem' }}
          >
            <Plus size={14} />
            New Room
          </button>
          <button
            onClick={() => setShowDirectModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.4rem' }}
          >
            <MessageCircle size={14} />
            Direct Msg
          </button>
        </div>
      </div>

      {/* Rooms & Chats Scrollable Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.5rem' }}>
        {/* GROUP ROOMS SECTION */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 0.5rem 0.4rem',
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Users size={13} />
              Group Rooms ({groupRooms.length})
            </span>
            <button
              onClick={() => setShowAvailableModal(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-primary)',
                fontSize: '0.72rem',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
              title="Explore public rooms"
            >
              <Compass size={12} />
              Explore
            </button>
          </div>

          {loadingRooms ? (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
              Loading rooms...
            </p>
          ) : groupRooms.filter((r) => matchesSearch(r.name)).length === 0 ? (
            <div style={{
              padding: '0.75rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              margin: '0.25rem 0.4rem',
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                No group rooms found.
              </p>
              <button
                onClick={() => setShowAvailableModal(true)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
              >
                Join Public Rooms
              </button>
            </div>
          ) : (
            groupRooms
              .filter((r) => matchesSearch(r.name))
              .map((room) => {
                const isActive = activeRoom?._id === room._id;
                const unread = unreadCounts[room._id] || room.unreadCount || 0;

                return (
                  <div
                    key={room._id}
                    onClick={() => selectRoom(room)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.65rem',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '0.2rem',
                      cursor: 'pointer',
                      backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        color: isActive ? '#fff' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Hash size={15} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontWeight: isActive ? 700 : 600,
                          fontSize: '0.85rem',
                          color: isActive ? '#fff' : 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {room.name}
                        </p>
                        {room.lastMessage && (
                          <p style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {room.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>

                    {unread > 0 && (
                      <span className="badge-unread">
                        {unread}
                      </span>
                    )}
                  </div>
                );
              })
          )}
        </div>

        {/* DIRECT MESSAGES SECTION */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 0.5rem 0.4rem',
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MessageCircle size={13} />
              Direct Messages ({directRooms.length})
            </span>
            <button
              onClick={() => setShowDirectModal(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-primary)',
                fontSize: '0.72rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
              title="Start new direct message"
            >
              + Chat
            </button>
          </div>

          {directRooms.filter((r) => matchesSearch(getDirectChatInfo(r).username)).length === 0 ? (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem', textAlign: 'center' }}>
              No direct chats yet. Click '+ Chat' to message someone!
            </p>
          ) : (
            directRooms
              .filter((r) => matchesSearch(getDirectChatInfo(r).username))
              .map((room) => {
                const isActive = activeRoom?._id === room._id;
                const unread = unreadCounts[room._id] || room.unreadCount || 0;
                const { username, avatar, online } = getDirectChatInfo(room);

                return (
                  <div
                    key={room._id}
                    onClick={() => selectRoom(room)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.65rem',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '0.2rem',
                      cursor: 'pointer',
                      backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img
                          src={avatar}
                          alt={username}
                          style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                        />
                        <span
                          className={online ? 'badge-online' : 'badge-offline'}
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            border: '2px solid var(--bg-secondary)',
                          }}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontWeight: isActive ? 700 : 600,
                          fontSize: '0.85rem',
                          color: isActive ? '#fff' : 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {username}
                        </p>
                        {room.lastMessage && (
                          <p style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {room.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>

                    {unread > 0 && (
                      <span className="badge-unread">
                        {unread}
                      </span>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && <CreateRoomModal onClose={() => setShowCreateModal(false)} />}
      {showDirectModal && <DirectMessageModal onClose={() => setShowDirectModal(false)} />}
      {showAvailableModal && <AvailableRoomsModal onClose={() => setShowAvailableModal(false)} />}
    </aside>
  );
};
