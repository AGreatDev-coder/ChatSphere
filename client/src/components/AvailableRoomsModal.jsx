import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useChat } from '../context/ChatContext';
import { X, Hash, LogIn } from 'lucide-react';

export const AvailableRoomsModal = ({ onClose }) => {
  const { joinGroupRoom } = useChat();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailable = async () => {
      try {
        setLoading(true);
        const res = await api.rooms.getAvailableRooms();
        if (res.success) {
          setRooms(res.rooms);
        }
      } catch (err) {
        console.error('Failed to load available rooms:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAvailable();
  }, []);

  const handleJoin = async (roomId) => {
    try {
      await joinGroupRoom(roomId);
      onClose();
    } catch (err) {
      console.error('Failed to join room:', err);
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
              <Hash size={18} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              Explore & Join Public Rooms
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.25rem', maxHeight: '350px', overflowY: 'auto' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
              Discovering public rooms...
            </p>
          ) : rooms.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
              No additional public rooms found. You have joined all available rooms!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {rooms.map((room) => (
                <div
                  key={room._id}
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Hash size={16} color="var(--accent-primary)" />
                      {room.name}
                    </h4>
                    {room.description && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {room.description}
                      </p>
                    )}
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                      Created by {room.creator?.username || 'Admin'} • {room.members?.length || 0} members
                    </span>
                  </div>

                  <button
                    onClick={() => handleJoin(room._id)}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <LogIn size={14} />
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
