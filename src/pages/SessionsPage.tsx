import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useSessionsContext } from '@/hooks';
import { SessionForm } from '@/components/sessions/SessionForm';
import { SessionsList } from '@/components/sessions/SessionsList';
import type { ResearchSession } from '@/types';

const SessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { createSession, updateSession, selectSession } = useSessionsContext();
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSession, setEditingSession] = useState<ResearchSession | null>(null);

  const handleSelectSession = (session: ResearchSession) => {
    selectSession(session);
    navigate('/');
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Page Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded hover:bg-[var(--bg-active)] transition-colors"
            title="Back"
          >
            <ArrowLeft size={20} style={{ color: 'var(--fg-primary)' }} />
          </button>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--fg-primary)' }}>
            All Sessions
          </h1>
        </div>

        <button
          onClick={() => {
            setEditingSession(null);
            setShowSessionForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded transition-colors"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'white',
          }}
        >
          <Plus size={18} />
          <span className="font-medium">New Session</span>
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <SessionsList
            onSelectSession={handleSelectSession}
            onEditSession={(session) => {
              setEditingSession(session);
              setShowSessionForm(true);
            }}
          />
        </div>
      </div>

      {/* Session Form Modal */}
      <SessionForm
        isOpen={showSessionForm}
        onClose={() => {
          setShowSessionForm(false);
          setEditingSession(null);
        }}
        onCreate={async (title, goal) => {
          const newSession = await createSession(title, goal);
          return newSession;
        }}
        onUpdate={updateSession}
        editSession={editingSession}
      />
    </div>
  );
};

export default SessionsPage;
