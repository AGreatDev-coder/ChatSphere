import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatArea } from '../components/ChatArea';

export const ChatPage = () => {
  return (
    <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 61px)', overflow: 'hidden' }}>
      <Sidebar />
      <ChatArea />
    </div>
  );
};
