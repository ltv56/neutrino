import { createContext } from 'react';
import type { ResearchSession } from '@/types';

export interface SessionsContextType {
  sessions: ResearchSession[];
  loading: boolean;
  error: string | null;
  createSession: (title: string, goal?: string) => Promise<ResearchSession>;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSession: (sessionId: string, title: string, goal?: string) => Promise<void>;
  refetch: () => Promise<void>;
  currentSession: ResearchSession | null;
  selectSession: (sessionOrId: ResearchSession | string | null) => void;
}

export const SessionsContext = createContext<SessionsContextType | undefined>(undefined);
