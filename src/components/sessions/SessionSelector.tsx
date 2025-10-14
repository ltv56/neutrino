import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Plus, FolderOpen } from 'lucide-react';
import type { ResearchSession } from '@/types';
import Tooltip from '@/components/common/Tooltip';

interface SessionSelectorProps {
  sessions: ResearchSession[];
  currentSession: ResearchSession | null;
  onSelectSession: (session: ResearchSession) => void;
  onCreateNew: () => void;
  onViewAll?: () => void;
}

const SessionSelector: React.FC<SessionSelectorProps> = ({
  sessions,
  currentSession,
  onSelectSession,
  onCreateNew,
  onViewAll,
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Get recent sessions (last 5) - memoized to avoid recomputing on every render
  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [sessions]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Session Selector Button */}
      <Tooltip content={currentSession?.title || 'No Session'} placement="bottom">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--bg-active)] transition-colors"
          style={{
            backgroundColor: isOpen ? 'var(--bg-active)' : 'transparent',
          }}
        >
          <FolderOpen size={16} style={{ color: 'var(--fg-primary)', flexShrink: 0 }} />
          <span
            className="text-sm font-medium truncate"
            style={{ color: 'var(--fg-primary)', maxWidth: '200px' }}
          >
            {currentSession?.title || 'No Session'}
          </span>
          <ChevronDown
            size={14}
            style={{
              color: 'var(--fg-secondary)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              flexShrink: 0,
            }}
          />
        </button>
      </Tooltip>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 rounded shadow-lg z-50"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            minWidth: '280px',
            maxHeight: '400px',
            overflow: 'auto',
          }}
        >
          {/* Header */}
          <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="text-xs font-semibold" style={{ color: 'var(--fg-secondary)' }}>
              RECENT SESSIONS
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="py-1">
            {recentSessions.length === 0 ? (
              <div className="px-3 py-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                No sessions yet
              </div>
            ) : (
              recentSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--bg-active)] transition-colors flex items-start gap-2"
                  style={{
                    backgroundColor: currentSession?.id === session.id ? 'var(--bg-active)' : 'transparent',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--fg-primary)' }}>
                      {session.title}
                    </div>
                    {session.goal && (
                      <div className="text-xs truncate" style={{ color: 'var(--fg-secondary)' }}>
                        {session.goal}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }} />

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={() => {
                onCreateNew();
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-[var(--bg-active)] transition-colors flex items-center gap-2"
            >
              <Plus size={16} style={{ color: 'var(--fg-secondary)' }} />
              <span className="text-sm" style={{ color: 'var(--fg-primary)' }}>
                New Session
              </span>
            </button>

            <button
              onClick={() => {
                if (onViewAll) {
                  onViewAll();
                } else {
                  navigate('/sessions');
                }
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-[var(--bg-active)] transition-colors flex items-center gap-2"
            >
              <FolderOpen size={16} style={{ color: 'var(--fg-secondary)' }} />
              <span className="text-sm" style={{ color: 'var(--fg-primary)' }}>
                View All Sessions {sessions.length > 0 && `(${sessions.length})`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionSelector;