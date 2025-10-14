import type { ReactNode } from 'react';
import { useSessions, useCurrentSession } from '@/hooks';
import { SessionsContext } from './SessionsContext';

export const SessionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { sessions, loading, error, createSession, deleteSession, updateSession, refetch } = useSessions();
  const { currentSession, selectSession } = useCurrentSession(sessions);

  return (
    <SessionsContext.Provider
      value={{
        sessions,
        loading,
        error,
        createSession,
        deleteSession,
        updateSession,
        refetch,
        currentSession,
        selectSession,
      }}
    >
      {children}
    </SessionsContext.Provider>
  );
};
