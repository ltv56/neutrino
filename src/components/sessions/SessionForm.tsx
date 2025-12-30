import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/contexts/ToastContext';
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
  const toast = useToast();
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
        toast.success('Session updated successfully');
      } else {
        await onCreate(title, goal || undefined);
        // Toast handled by Layout.tsx with session name
      }
      onClose();
    } catch (err) {
      console.error('Error saving session:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Error saving session: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="rounded-lg p-5 w-full max-w-md"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
        data-no-drag
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--fg-primary)' }}>
          {editSession ? 'Edit Session' : 'New Session'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--fg-secondary)' }}>
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded text-sm outline-none"
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

          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--fg-secondary)' }}>
              Goal (optional)
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded text-sm outline-none resize-none"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--fg-primary)',
              }}
              rows={3}
              placeholder="What do you want to achieve?"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded text-sm transition-colors"
              style={{
                color: 'var(--fg-secondary)',
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-active)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-2.5 py-1.5 rounded text-sm transition-all"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'white',
                opacity: isSubmitting ? 0.5 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.filter = 'brightness(0.9)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              {isSubmitting ? 'Saving...' : (editSession ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
