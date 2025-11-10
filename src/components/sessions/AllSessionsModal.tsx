import React, { useState } from 'react';
import { X, Search, Plus, Edit2, Trash2 } from 'lucide-react';
import type { ResearchSession } from '@/types';

interface AllSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ResearchSession[];
  currentSession: ResearchSession | null;
  onSelectSession: (session: ResearchSession) => void;
  onCreateNew: () => void;
  onEdit: (session: ResearchSession) => void;
  onDelete: (sessionId: string) => void;
}

const AllSessionsModal: React.FC<AllSessionsModalProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSession,
  onSelectSession,
  onCreateNew,
  onEdit,
  onDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Filter sessions based on search query
  const filteredSessions = sessions.filter(
    (session) =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.goal?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectSession = (session: ResearchSession) => {
    onSelectSession(session);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-xl"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--fg-primary)' }}>
            All Sessions
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
            title="Close"
          >
            <X size={20} style={{ color: 'var(--fg-secondary)' }} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded"
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <Search size={16} style={{ color: 'var(--fg-secondary)' }} />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--fg-primary)' }}
              autoFocus
            />
          </div>
        </div>

        {/* Sessions List */}
        <div style={{ maxHeight: 'calc(80vh - 180px)', overflowY: 'auto' }}>
          {filteredSessions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                {searchQuery ? 'No sessions found' : 'No sessions yet'}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="px-4 py-3 hover:bg-[var(--bg-active)] transition-colors group"
                  style={{
                    backgroundColor:
                      currentSession?.id === session.id ? 'var(--bg-active)' : 'transparent',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleSelectSession(session)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--fg-primary)' }}>
                        {session.title}
                      </div>
                      {session.goal && (
                        <div className="text-xs mt-1 truncate" style={{ color: 'var(--fg-secondary)' }}>
                          {session.goal}
                        </div>
                      )}
                      <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                        Updated: {new Date(session.updated_at).toLocaleDateString()}
                      </div>
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(session);
                        }}
                        className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} style={{ color: 'var(--fg-secondary)' }} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete session "${session.title}"?`)) {
                            onDelete(session.id);
                          }
                        }}
                        className="p-1 rounded hover:bg-red-500/20 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} style={{ color: 'var(--fg-secondary)' }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 flex justify-end"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={() => {
              onCreateNew();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded hover:bg-[var(--bg-active)] transition-colors"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
            }}
          >
            <Plus size={16} />
            <span className="text-sm font-medium">New Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllSessionsModal;
