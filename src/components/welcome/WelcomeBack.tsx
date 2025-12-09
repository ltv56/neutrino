import React from 'react';
import type { ContextSnapshot } from '@/types';
import { Calendar, FileText, Highlighter, StickyNote, HelpCircle, ArrowRight } from 'lucide-react';

interface WelcomeBackProps {
  snapshot: ContextSnapshot;
  onContinue?: () => void;
}

const WelcomeBack: React.FC<WelcomeBackProps> = ({ snapshot, onContinue }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="max-w-xl w-full space-y-5">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 text-accent">
            Welcome Back! 👋
          </h1>
          <p className="text-sm text-secondary flex items-center justify-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Last active {formatTime(snapshot.timestamp)}
          </p>
        </div>

        {/* Context Summary Card */}
        <div className="bg-surface rounded-lg p-4 shadow-sm" style={{ borderWidth: '2px', borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold mb-3 text-primary">
            Where you left off
          </h2>

          <div className="space-y-2.5">
            {/* Last Document */}
            {snapshot.last_document && (
              <div className="flex items-start gap-2.5 p-2.5 bg-background rounded-md hover:bg-background/80 transition-colors">
                <FileText className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-primary mb-0.5">
                    Last Reading
                  </div>
                  <div className="text-sm text-secondary truncate">
                    {snapshot.last_document.document_title}
                  </div>
                  <div className="text-xs text-tertiary mt-0.5">
                    Page {snapshot.last_document.page_number}
                    {snapshot.last_document.scroll_position &&
                      ` • ${Math.round(snapshot.last_document.scroll_position * 100)}% scrolled`
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Last Highlight */}
            {snapshot.last_highlight && (
              <div className="flex items-start gap-2.5 p-2.5 bg-background rounded-md hover:bg-background/80 transition-colors">
                <Highlighter className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-primary mb-0.5">
                    Last Highlight
                  </div>
                  <div className="text-sm text-secondary line-clamp-2 italic">
                    "{snapshot.last_highlight.content}"
                  </div>
                  <div className="text-xs text-tertiary mt-0.5">
                    Page {snapshot.last_highlight.page_number}
                  </div>
                </div>
              </div>
            )}

            {/* Last Note */}
            {snapshot.last_note && (
              <div className="flex items-start gap-2.5 p-2.5 bg-background rounded-md hover:bg-background/80 transition-colors">
                <StickyNote className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-primary mb-0.5">
                    Last Note
                  </div>
                  <div className="text-sm font-medium text-secondary truncate">
                    {snapshot.last_note.title}
                  </div>
                  <div className="text-xs text-tertiary line-clamp-1 mt-0.5">
                    {snapshot.last_note.content_preview}
                  </div>
                </div>
              </div>
            )}

            {/* Research Questions */}
            {snapshot.research_questions && snapshot.research_questions.length > 0 && (
              <div className="flex items-start gap-2.5 p-2.5 bg-background rounded-md hover:bg-background/80 transition-colors">
                <HelpCircle className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-primary mb-1.5">
                    Open Questions ({snapshot.research_questions.length})
                  </div>
                  <ul className="space-y-0.5">
                    {snapshot.research_questions.slice(0, 3).map((question, idx) => (
                      <li key={idx} className="text-xs text-secondary line-clamp-1">
                        • {question}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center pt-2">
          {snapshot.last_document && (
            <button
              onClick={onContinue}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover transition-colors text-sm font-medium shadow-sm cursor-pointer"
            >
              Continue Reading
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => {
              window.dispatchEvent(new Event('workspace:create-note'));
            }}
            className="px-4 py-2 bg-surface text-primary rounded-md hover:bg-background transition-colors text-sm font-medium cursor-pointer"
            style={{ borderWidth: '1px', borderColor: 'var(--border)' }}
          >
            Start Fresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBack;
