import React, { useState, useEffect } from 'react';
import type { ContextSnapshot } from '@/types';
import { X, FileText, ArrowRight, Highlighter, StickyNote, HelpCircle } from 'lucide-react';

interface WelcomeBackBannerProps {
  snapshot: ContextSnapshot;
  onContinueDocument?: () => void;
  onContinueHighlight?: () => void;
  onContinueNote?: () => void;
  onDismiss: () => void;
}

const WelcomeBackBanner: React.FC<WelcomeBackBannerProps> = ({
  snapshot,
  onContinueDocument,
  onContinueHighlight,
  onContinueNote,
  onDismiss
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Map slides to their corresponding continue handlers and types
  const slideActions: Array<{ type: 'document' | 'highlight' | 'note'; handler?: () => void; icon: React.ReactNode; label: string }> = [];

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Build slides for ALL available activities
  // If multiple activities exist, use carousel; if only one, show it directly
  const slides: React.ReactNode[] = [];

  // Add slide for last document
  if (snapshot.last_document) {
    slideActions.push({
      type: 'document',
      handler: onContinueDocument,
      icon: <FileText className="w-3 h-3" />,
      label: 'Continue Reading'
    });
    slides.push(
      <div key="document" className="flex items-center gap-1.5 min-w-0">
        <FileText className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />
        <span className="text-xs truncate" style={{ color: 'var(--fg-primary)' }}>
          {snapshot.last_document.document_title}
        </span>
        <span className="text-xs shrink-0" style={{ color: 'var(--fg-tertiary)' }}>
          • Page {snapshot.last_document.page_number}
        </span>
      </div>
    );
  }

  // Add slide for last highlight
  if (snapshot.last_highlight) {
    slideActions.push({
      type: 'highlight',
      handler: onContinueHighlight,
      icon: <Highlighter className="w-3 h-3" />,
      label: 'Go to Highlight'
    });
    slides.push(
      <div key="highlight" className="flex items-center gap-1.5 min-w-0">
        <Highlighter className="w-3 h-3 shrink-0" style={{ color: '#eab308' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>
          Last highlight:
        </span>
        {snapshot.last_highlight.content ? (
          <span className="text-xs truncate italic" style={{ color: 'var(--fg-primary)' }}>
            "{snapshot.last_highlight.content}"
          </span>
        ) : (
          <span className="text-xs" style={{ color: 'var(--fg-primary)' }}>
            Page {snapshot.last_highlight.page_number}
          </span>
        )}
      </div>
    );
  }

  // Add slide for last note
  if (snapshot.last_note) {
    slideActions.push({
      type: 'note',
      handler: onContinueNote,
      icon: <StickyNote className="w-3 h-3" />,
      label: 'Open Note'
    });
    slides.push(
      <div key="note" className="flex items-center gap-1.5 min-w-0">
        <StickyNote className="w-3 h-3 shrink-0" style={{ color: '#3b82f6' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>
          Last note:
        </span>
        <span className="text-xs font-medium truncate" style={{ color: 'var(--fg-primary)' }}>
          {snapshot.last_note.title}
        </span>
      </div>
    );
  }

  // Slide 4: Research Questions
  if (snapshot.research_questions && snapshot.research_questions.length > 0) {
    slides.push(
      <div className="flex items-center gap-1.5 min-w-0">
        <HelpCircle className="w-3 h-3 shrink-0" style={{ color: '#a855f7' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>
          {snapshot.research_questions.length} open question{snapshot.research_questions.length > 1 ? 's' : ''}:
        </span>
        <span className="text-xs truncate" style={{ color: 'var(--fg-primary)' }}>
          {snapshot.research_questions[0]}
        </span>
      </div>
    );
  }

  // Auto-rotate slides every 4 seconds
  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-2 mb-3 rounded-lg border"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Left: Fixed welcome + Carousel info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Fixed part: Welcome back */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm">👋</span>
          <span className="text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>
            Welcome back!
          </span>
          <span className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>
            {formatTime(snapshot.timestamp)}
          </span>
        </div>

        {/* Divider */}
        {slides.length > 0 && (
          <div className="w-px h-3.5 shrink-0" style={{ backgroundColor: 'var(--border)' }} />
        )}

        {/* Info display: carousel if multiple slides, direct display if single slide */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {slides.length === 1 ? (
            // Single slide: show directly without carousel
            slides[0]
          ) : (
            // Multiple slides: use carousel
            <div
              className="transition-transform duration-500 ease-in-out flex"
              style={{
                transform: `translateX(-${currentSlide * 100}%)`,
              }}
            >
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className="min-w-full"
                  style={{ flex: '0 0 100%' }}
                >
                  {slide}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions - Continue button for current slide */}
      <div className="flex items-center gap-2">
        {slideActions.length > 0 && slideActions[currentSlide] && (
          <button
            onClick={slideActions[currentSlide].handler}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer hover:opacity-90"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
            }}
          >
            {slideActions[currentSlide].icon}
            {slideActions[currentSlide].label}
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors cursor-pointer"
          style={{ color: 'var(--fg-tertiary)' }}
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default WelcomeBackBanner;
