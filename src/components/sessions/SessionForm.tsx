import { useState, useEffect } from 'react';
import type { ResearchSession } from '@/types';

interface SessionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, goal?: string) => Promise<ResearchSession>;
  onUpdate: (sessionId: string, title: string, goal?: string) => Promise<void>;
  editSession?: ResearchSession | null;
}

export const SessionForm: React.FC<SessionFormProps> = ({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  editSession
}) => {
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editSession) {
      setTitle(editSession.title);
      setGoal(editSession.goal || '');
    } else {
      setTitle('');
      setGoal('');
    }
  }, [editSession, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editSession) {
        await onUpdate(editSession.id, title, goal || undefined);
      } else {
        await onCreate(title, goal || undefined);
      }
      onClose();
    } catch (err) {
      alert(`Error saving session: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg p-6 w-full max-w-md"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        onClick={(e) => e.stopPropagation()}
        data-no-drag
      >
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--fg-primary)' }}>
          {editSession ? 'Edit Session' : 'Create New Session'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-primary)' }}>
              Session Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg outline-none"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--fg-primary)',
              }}
              placeholder="e.g., Machine Learning Research"
              required
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-primary)' }}>
              Research Goal (optional)
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full px-3 py-2 rounded-lg outline-none"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--fg-primary)',
              }}
              rows={3}
              placeholder="What do you want to achieve with this research?"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded hover:bg-[var(--bg-active)] transition-colors"
              style={{ color: 'var(--fg-secondary)' }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded transition-colors"
              style={{
                backgroundColor: isSubmitting ? 'var(--bg-tertiary)' : 'var(--accent)',
                color: 'white',
              }}
            >
              {isSubmitting ? 'Saving...' : (editSession ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
