'use client';

import React, { createContext, useContext, useState } from 'react';
import Announcer from '@/components/Announcer';

interface AnnouncementContextType {
  announce: (message: string) => void;
}

const AnnouncementContext = createContext<AnnouncementContextType | undefined>(undefined);

export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');

  const announce = (newMessage: string) => {
    setMessage(newMessage);
    // 3초 후 메시지 초기화
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <AnnouncementContext.Provider value={{ announce }}>
      {children}
      <Announcer message={message} />
    </AnnouncementContext.Provider>
  );
}

export function useAnnouncement() {
  const context = useContext(AnnouncementContext);
  if (context === undefined) {
    throw new Error('useAnnouncement must be used within an AnnouncementProvider');
  }
  return context;
} 