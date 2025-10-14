import { useState, useEffect } from 'react';
import { sessionService } from '@/services';
import type { ResearchSession } from '@/types';

export const useSessions = () => {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sessionService.getAll();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (title: string, goal?: string): Promise<ResearchSession> => {
    setError(null);
    try {
      const newSession = await sessionService.create(title, goal);
      // Optimistic update: Add new session to list without fetching
      setSessions((prev) => [...prev, newSession]);
      return newSession;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const deleteSession = async (sessionId: string) => {
    setError(null);
    try {
      await sessionService.delete(sessionId);
      // Optimistic update: Remove session from list without fetching
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const updateSession = async (
    sessionId: string,
    title: string,
    goal?: string
  ) => {
    setError(null);
    try {
      await sessionService.update(sessionId, title, goal);
      // Optimistic update: Update session in list without fetching
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, title, goal: goal || '', updated_at: new Date().toISOString() }
            : s
        )
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return {
    sessions,
    loading,
    error,
    createSession,
    deleteSession,
    updateSession,
    refetch: fetchSessions,
  };
};
