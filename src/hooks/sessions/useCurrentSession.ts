import { useState, useEffect, useRef } from 'react';
import type { ResearchSession } from '@/types';

const CURRENT_SESSION_KEY = 'neutrino_current_session_id';

export const useCurrentSession = (sessions: ResearchSession[]) => {
  const [currentSession, setCurrentSession] = useState<ResearchSession | null>(null);
  const isManualSelection = useRef(false);

  // Sync current session with sessions array (for updates)
  useEffect(() => {
    const storedSessionId = localStorage.getItem(CURRENT_SESSION_KEY);

    console.log('[useCurrentSession] Effect triggered:', {
      sessionsCount: sessions.length,
      currentSessionId: currentSession?.id,
      storedSessionId,
      isManualSelection: isManualSelection.current,
    });

    if (isManualSelection.current) {
      // Skip this cycle if we just manually selected a session
      isManualSelection.current = false;
      console.log('[useCurrentSession] Skipping - manual selection');
      return;
    }

    if (currentSession) {
      // If we have a current session, check if it still exists in the array
      const updatedSession = sessions.find((s) => s.id === currentSession.id);
      if (updatedSession) {
        // Session still exists - only update if data actually changed
        // Compare key fields for performance (avoid JSON.stringify)
        const hasChanged =
          updatedSession.title !== currentSession.title ||
          updatedSession.goal !== currentSession.goal ||
          updatedSession.updated_at !== currentSession.updated_at ||
          updatedSession.phase !== currentSession.phase;

        if (hasChanged) {
          setCurrentSession(updatedSession);
        }
      } else {
        // Current session was deleted - switch to another one
        if (sessions.length > 0) {
          setCurrentSession(sessions[0]);
          localStorage.setItem(CURRENT_SESSION_KEY, sessions[0].id);
        } else {
          setCurrentSession(null);
          localStorage.removeItem(CURRENT_SESSION_KEY);
        }
      }
    } else if (storedSessionId && sessions.length > 0) {
      // No current session but we have a stored ID - load it
      console.log('[useCurrentSession] Loading stored session:', storedSessionId);
      const session = sessions.find((s) => s.id === storedSessionId);
      if (session) {
        console.log('[useCurrentSession] Found stored session:', session.title);
        setCurrentSession(session);
      } else {
        // Stored session not found, use first session
        console.log('[useCurrentSession] Stored session not found, using first session');
        setCurrentSession(sessions[0]);
        localStorage.setItem(CURRENT_SESSION_KEY, sessions[0].id);
      }
    } else if (sessions.length > 0 && !storedSessionId && !currentSession) {
      // No stored session and no current session - use first one
      console.log('[useCurrentSession] Auto-selecting first session:', sessions[0].title);
      setCurrentSession(sessions[0]);
      localStorage.setItem(CURRENT_SESSION_KEY, sessions[0].id);
    } else if (sessions.length === 0) {
      // No sessions available - clear current
      console.log('[useCurrentSession] No sessions, clearing current');
      setCurrentSession(null);
      localStorage.removeItem(CURRENT_SESSION_KEY);
    } else {
      console.log('[useCurrentSession] No condition matched - doing nothing');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);

  const selectSession = (sessionOrId: ResearchSession | string | null) => {
    console.log('[useCurrentSession] selectSession called:', sessionOrId);
    // Mark that this is a manual selection to prevent useEffect from overriding
    isManualSelection.current = true;

    if (sessionOrId === null) {
      // Clear current session
      console.log('[useCurrentSession] Clearing current session');
      setCurrentSession(null);
      localStorage.removeItem(CURRENT_SESSION_KEY);
    } else if (typeof sessionOrId === 'string') {
      // If passed an ID, find the session
      const session = sessions.find((s) => s.id === sessionOrId);
      if (session) {
        console.log('[useCurrentSession] Selected session by ID:', session.title);
        setCurrentSession(session);
        localStorage.setItem(CURRENT_SESSION_KEY, session.id);
      }
    } else if (sessionOrId && sessionOrId.id) {
      // If passed a session object with valid id
      console.log('[useCurrentSession] Selected session by object:', sessionOrId.title);
      setCurrentSession(sessionOrId);
      localStorage.setItem(CURRENT_SESSION_KEY, sessionOrId.id);
    }
  };

  return {
    currentSession,
    selectSession,
  };
};
