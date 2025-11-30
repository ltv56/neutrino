import React, { useMemo } from 'react';
import { Edit2, Trash2, FolderOpen } from 'lucide-react';
import { useSessionsContext } from '@/hooks';
import Tooltip from '@/components/common/Tooltip';
import type { ResearchSession } from '@/types';

interface SessionsListProps {
  sessions?: ResearchSession[]; // Optional: override sessions from context
  onSelectSession?: (session: ResearchSession) => void;
  onEditSession?: (session: ResearchSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  showActions?: boolean;
}

export const SessionsList: React.FC<SessionsListProps> = ({
  sessions: sessionsProp,
  onSelectSession,
  onEditSession,
  onDeleteSession,
  showActions = true,
}) => {
  const { sessions: sessionsFromContext, currentSession, selectSession, deleteSession } = useSessionsContext();

  // Use prop sessions if provided, otherwise use context sessions
  const sessions = sessionsProp || sessionsFromContext;

  // Sort sessions by updated_at (newest first)
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [sessions]);

  const handleSelectSession = (session: ResearchSession) => {
    if (onSelectSession) {
      onSelectSession(session);
    } else {
      selectSession(session);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      if (onDeleteSession) {
        onDeleteSession(sessionId);
      } else {
        // If deleting current session, switch to another one first
        if (currentSession?.id === sessionId) {
          const otherSession = sortedSessions.find((s) => s.id !== sessionId);
          if (otherSession) {
            selectSession(otherSession);
          } else {
            selectSession(null);
          }
        }
        await deleteSession(sessionId);
      }
    }
  };

  const handleEdit = (session: ResearchSession) => {
    if (onEditSession) {
      onEditSession(session);
    }
  };

  if (sortedSessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <FolderOpen size={64} style={{ color: 'var(--fg-muted)', marginBottom: '16px' }} />
        <p className="text-lg font-medium" style={{ color: 'var(--fg-secondary)' }}>
          No sessions yet
        </p>
        <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>
          Create your first research session to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedSessions.map((session) => (
        <div
          key={session.id}
          className="rounded-lg p-4 transition-all hover:bg-[var(--bg-tertiary)] cursor-pointer"
          style={{
            backgroundColor: currentSession?.id === session.id ? 'var(--bg-secondary)' : 'transparent',
            border: `1px solid ${
              currentSession?.id === session.id ? 'var(--accent)' : 'var(--border)'
            }`,
          }}
          onClick={() => handleSelectSession(session)}
        >
          <div className="flex items-start justify-between gap-4">
            {/* Left: Session Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3
                  className="text-base font-semibold truncate"
                  style={{ color: 'var(--fg-primary)' }}
                >
                  {session.title}
                </h3>
                {currentSession?.id === session.id && (
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded shrink-0"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'white',
                    }}
                  >
                    Current
                  </span>
                )}
              </div>

              {/* Session Goal */}
              {session.goal && (
                <p
                  className="text-sm mb-2 line-clamp-1"
                  style={{ color: 'var(--fg-secondary)' }}
                >
                  {session.goal}
                </p>
              )}

              {/* Session Meta */}
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--fg-tertiary)' }}>
                <span>Phase: {session.phase}</span>
                <span>•</span>
                <span>Updated {new Date(session.updated_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Right: Actions */}
            {showActions && onEditSession && (
              <div className="flex items-center gap-1 shrink-0">
                <Tooltip content="Edit">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(session);
                    }}
                    className="p-1.5 rounded hover:bg-[var(--bg-active)] transition-colors"
                  >
                    <Edit2 size={14} style={{ color: 'var(--fg-secondary)' }} />
                  </button>
                </Tooltip>
                <Tooltip content="Delete">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(session.id);
                    }}
                    className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={14} style={{ color: 'var(--fg-secondary)' }} />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};