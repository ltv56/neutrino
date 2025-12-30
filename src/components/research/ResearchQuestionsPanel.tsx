import { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { noteService, researchQuestionsService } from '@/services';
import type { ResearchQuestion } from '@/services/researchQuestions';
import { useSessionsContext } from '@/hooks';

interface ResearchQuestionsPanelProps {
  onNavigateToNote?: (noteId: string) => void;
}

const ResearchQuestionsPanel: React.FC<ResearchQuestionsPanelProps> = ({
  onNavigateToNote,
}) => {
  const { currentSession } = useSessionsContext();
  const [questions, setQuestions] = useState<ResearchQuestion[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadQuestions = async () => {
      if (!currentSession?.id) {
        setQuestions([]);
        return;
      }

      setLoading(true);
      try {
        const notes = await noteService.getAll(currentSession.id);
        const extractedQuestions = researchQuestionsService.extractQuestionsFromNotes(notes);
        setQuestions(extractedQuestions);
      } catch (error) {
        console.error('Failed to load research questions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();

    // Listen for note changes to refresh questions
    const handleNoteEvent = () => {
      loadQuestions();
    };

    window.addEventListener('note-saved', handleNoteEvent);
    window.addEventListener('note-deleted', handleNoteEvent);

    return () => {
      window.removeEventListener('note-saved', handleNoteEvent);
      window.removeEventListener('note-deleted', handleNoteEvent);
    };
  }, [currentSession?.id]);

  if (!currentSession) {
    return (
      <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
        No active session
      </div>
    );
  }

  return (
    <div className="border-b" style={{ borderColor: 'var(--border)' }}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2.5 flex items-center justify-between transition-colors"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div className="flex items-center gap-2">
          <HelpCircle size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--fg-primary)' }}>
            Questions
          </span>
          {questions.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>
              ({questions.length})
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown size={16} style={{ color: 'var(--fg-tertiary)' }} />
        ) : (
          <ChevronRight size={16} style={{ color: 'var(--fg-tertiary)' }} />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1">
          {loading ? (
            <div className="text-xs py-2" style={{ color: 'var(--fg-secondary)' }}>
              Loading questions...
            </div>
          ) : questions.length === 0 ? (
            <div className="text-xs py-6 px-2" style={{ color: 'var(--fg-tertiary)' }}>
              No questions found. Add "?", "TODO:", "QUESTION:", or "Q:" in your notes to track them.
            </div>
          ) : (
            <div className="space-y-1">
              {questions.map((question, index) => (
                <div
                  key={`${question.sourceNoteId}-${index}`}
                  onClick={() => onNavigateToNote?.(question.sourceNoteId)}
                  className="px-2 py-1.5 rounded transition-colors cursor-pointer"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div className="flex items-start gap-2">
                    <HelpCircle
                      size={14}
                      style={{ color: 'var(--accent)', marginTop: '2px' }}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm break-words font-medium" style={{ color: 'var(--fg-primary)' }}>
                        {question.text}
                      </p>
                      <div className="mt-0.5 inline-flex items-center gap-1 text-xs" style={{ color: 'var(--fg-tertiary)' }}>
                        <ExternalLink size={11} />
                        {question.sourceNoteTitle}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResearchQuestionsPanel;
