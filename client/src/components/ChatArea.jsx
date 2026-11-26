import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Hash,
  Send,
  Users,
  LogOut,
  Trash2,
  Info,
  CheckCheck,
  Check,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { RoomMembersModal } from './RoomMembersModal';

export const ChatArea = () => {
  const { user, isAdmin } = useAuth();
  const {
    activeRoom,
    messages,
    loadingMessages,
    sendMessage,
    leaveGroupRoom,
    adminDeleteRoom,
  } = useChat();
  const { emitTyping, emitStopTyping, getTypingUsersInRoom, isUserOnline } = useSocket();

  const [inputContent, setInputContent] = useState('');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Auto-scroll to bottom whenever messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle typing indicator dispatch
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputContent(val);

    if (!activeRoom) return;

    if (val.trim()) {
      emitTyping(activeRoom._id);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        emitStopTyping(activeRoom._id);
      }, 2000);
    } else {
      emitStopTyping(activeRoom._id);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    emitStopTyping(activeRoom._id);
    const content = inputContent;
    setInputContent('');
    await sendMessage(content);
  };

  const handleAdminDelete = async () => {
    if (!window.confirm(`[Admin RBAC] Are you sure you want to permanently delete the room "${activeRoom.name}" and all its messages?`)) {
      return;
    }
    await adminDeleteRoom(activeRoom._id);
  };

  const handleLeave = async () => {
    if (!window.confirm(`Leave room "${activeRoom.name}"?`)) return;
    await leaveGroupRoom(activeRoom._id);
  };

  const typingUsers = activeRoom ? getTypingUsersInRoom(activeRoom._id) : [];

  // Helper for room title and subtitle
  const getHeaderInfo = () => {
    if (!activeRoom) return {};
    if (activeRoom.isGroup) {
      return {
        title: activeRoom.name,
        subtitle: `${activeRoom.members?.length || 0} members • ${activeRoom.description || 'Group conversation'}`,
        isGroup: true,
      };
    }
    // Direct chat
    const otherMember = activeRoom.members?.find(
      (m) => (typeof m === 'string' ? m : m._id) !== user?._id
    );
    const otherUsername = otherMember?.username || 'Private Chat';
    const isOnline = otherMember ? isUserOnline(otherMember._id || otherMember) : false;
    return {
      title: otherUsername,
      subtitle: isOnline ? 'Active Now' : 'Offline',
      isGroup: false,
      avatar: otherMember?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUsername}`,
    };
  };

  if (!activeRoom) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-primary)',
          marginBottom: '1.25rem',
          border: '1px solid rgba(99, 102, 241, 0.3)',
        }}>
          <Sparkles size={36} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
          Welcome to ChatSphere
        </h2>
        <p style={{ maxWidth: '440px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          Select a room or start a direct conversation from the left sidebar to begin messaging in real-time.
        </p>
      </div>
    );
  }

  const header = getHeaderInfo();

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 61px)',
      backgroundColor: 'var(--bg-primary)',
    }}>
      {/* ROOM HEADER */}
      <div style={{
        padding: '0.85rem 1.5rem',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {header.isGroup ? (
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Hash size={20} />
            </div>
          ) : (
            <img
              src={header.avatar}
              alt={header.title}
              style={{ width: '38px', height: '38px', borderRadius: '50%' }}
            />
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                {header.title}
              </h3>
              {header.isGroup && (
                <span className="badge badge-user" style={{ fontSize: '0.65rem' }}>
                  Group Room
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {header.subtitle}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {header.isGroup && (
            <button
              onClick={() => setShowMembersModal(true)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Users size={14} />
              Members ({activeRoom.members?.length || 0})
            </button>
          )}

          {header.isGroup && (
            <button
              onClick={handleLeave}
              className="btn btn-secondary btn-sm"
              title="Leave this group room"
            >
              <LogOut size={14} />
              Leave
            </button>
          )}

          {/* Admin RBAC: Delete Room button */}
          {isAdmin && (
            <button
              onClick={handleAdminDelete}
              className="btn btn-danger btn-sm"
              title="Admin RBAC: Delete this room and all messages"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Trash2 size={14} />
              Delete Room
            </button>
          )}
        </div>
      </div>

      {/* MESSAGES LIST AREA */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}>
        {loadingMessages ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            Loading message history from MongoDB...
          </p>
        ) : messages.length === 0 ? (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            maxWidth: '380px',
          }}>
            <MessageSquare size={32} color="var(--accent-primary)" style={{ marginBottom: '0.5rem' }} />
            <h4 style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>No messages yet</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Say hello! Messages are delivered instantly via Socket.io and saved in MongoDB.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const sender = msg.sender || {};
            const isMe = (sender._id || sender) === user?._id;
            const time = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const readByOthers = msg.readBy?.filter(
              (u) => (typeof u === 'string' ? u : u._id) !== user?._id
            );

            return (
              <div
                key={msg._id || index}
                style={{
                  display: 'flex',
                  flexDirection: isMe ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  maxWidth: '75%',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                {!isMe && (
                  <img
                    src={sender.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${sender.username || 'user'}`}
                    alt={sender.username}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', marginTop: '2px', flexShrink: 0 }}
                  />
                )}

                <div>
                  {!isMe && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>
                        {sender.username || 'User'}
                      </span>
                      {sender.role === 'admin' && (
                        <span className="badge badge-admin" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                          Admin
                        </span>
                      )}
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {time}
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      padding: '0.65rem 0.95rem',
                      borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      backgroundColor: isMe ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      color: isMe ? '#fff' : 'var(--text-primary)',
                      border: isMe ? 'none' : '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)',
                      wordBreak: 'break-word',
                      fontSize: '0.9rem',
                      lineHeight: '1.45',
                    }}
                  >
                    {msg.content}
                  </div>

                  {isMe && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '0.3rem',
                      marginTop: '0.2rem',
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                    }}>
                      <span>{time}</span>
                      {readByOthers && readByOthers.length > 0 ? (
                        <CheckCheck size={13} color="var(--success)" title={`Seen by ${readByOthers.length}`} />
                      ) : (
                        <Check size={13} color="var(--text-muted)" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* TYPING INDICATOR LINE */}
      {typingUsers.length > 0 && (
        <div style={{
          padding: '0.3rem 1.5rem',
          fontSize: '0.75rem',
          color: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}>
          <span style={{ fontStyle: 'italic' }}>
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </span>
        </div>
      )}

      {/* MESSAGE INPUT FORM */}
      <form
        onSubmit={handleSendMessage}
        style={{
          padding: '0.85rem 1.5rem',
          backgroundColor: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <input
          type="text"
          className="form-input"
          placeholder={`Message ${header.isGroup ? '#' + header.title : header.title}...`}
          value={inputContent}
          onChange={handleInputChange}
          style={{ flex: 1 }}
          autoFocus
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!inputContent.trim()}
          style={{ padding: '0.65rem 1.1rem' }}
        >
          <Send size={16} />
          Send
        </button>
      </form>

      {/* Members Modal */}
      {showMembersModal && (
        <RoomMembersModal
          room={activeRoom}
          onClose={() => setShowMembersModal(false)}
        />
      )}
    </div>
  );
};
