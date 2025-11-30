import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useSessionsContext } from '@/hooks';
import { SessionForm } from '@/components/sessions/SessionForm';
import { SessionsList } from '@/components/sessions/SessionsList';
import type { ResearchSession } from '@/types';

const SessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { createSession, updateSession, selectSession, sessions } = useSessionsContext();
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSession, setEditingSession] = useState<ResearchSession | null>(null);

  const handleSelectSession = (session: ResearchSession) => {
    selectSession(session);
    navigate('/');
  };

  return (
    <div
      className="flex-1 rounded-lg p-6 overflow-auto"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 px-2 py-1 rounded transition-colors"
          style={{
            color: 'var(--fg-secondary)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--fg-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--fg-secondary)';
          }}
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Back</span>
        </button>

        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--fg-primary)' }}>
                Research Sessions
              </h1>
              <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                Manage your research sessions and organize your work
              </p>
            </div>

            {/* New Session Button */}
            <button
              onClick={() => {
                setEditingSession(null);
                setShowSessionForm(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm transition-all"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'white',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              <Plus size={14} />
              <span>New</span>
            </button>
          </div>

        </div>

        {/* Sessions List */}
        <SessionsList
          onSelectSession={handleSelectSession}
          onEditSession={(session) => {
            setEditingSession(session);
            setShowSessionForm(true);
          }}
          showActions={true}
        />
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
