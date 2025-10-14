import { useContext } from 'react';
import { SessionsContext } from '@/contexts';

export const useSessionsContext = () => {
  const context = useContext(SessionsContext);
  if (context === undefined) {
    throw new Error('useSessionsContext must be used within a SessionsProvider');
  }
  return context;
};
