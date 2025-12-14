import React, { useState, useEffect } from 'react';
import type { ContextSnapshot } from '@/types';
import { X, FileText, ArrowRight, Highlighter, StickyNote, HelpCircle, Brain, AlertCircle, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { phaseDetectionService } from '@/services';

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
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Helper to render expandable text content
  const renderExpandableText = (text: string, maxChars: number = 60) => {
    const isTruncated = text.length > maxChars;
    const displayText = !isExpanded && isTruncated ? text.substring(0, maxChars) + '...' : text;

    return (
      <>
        <span
          className="text-xs transition-all duration-300 ease-in-out flex-1 min-w-0"
          style={{
            color: 'var(--fg-primary)',
            lineHeight: isExpanded ? '1.5' : '1',
          }}
        >
          {displayText}
        </span>
        {isTruncated && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="shrink-0 p-0.5 rounded hover:bg-[var(--bg-active)] transition-all duration-200"
            style={{ color: 'var(--fg-tertiary)' }}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        )}
      </>
    );
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
      <div key="document" className="flex items-center gap-1.5 min-w-0 min-h-[20px]">
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
      <div key="highlight" className="flex items-center gap-1.5 min-w-0 min-h-[20px]">
        <Highlighter className="w-3 h-3 shrink-0" style={{ color: '#eab308' }} />
        <span className="text-xs font-medium shrink-0" style={{ color: 'var(--fg-secondary)' }}>
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
      <div key="note" className="flex items-center gap-1.5 min-w-0 min-h-[20px]">
        <StickyNote className="w-3 h-3 shrink-0" style={{ color: '#3b82f6' }} />
        <span className="text-xs font-medium shrink-0" style={{ color: 'var(--fg-secondary)' }}>
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
      <div key="questions" className="flex items-center gap-1.5 min-w-0 min-h-[20px]">
        <HelpCircle className="w-3 h-3 shrink-0" style={{ color: '#a855f7' }} />
        <span className="text-xs font-medium shrink-0" style={{ color: 'var(--fg-secondary)' }}>
          {snapshot.research_questions.length} open question{snapshot.research_questions.length > 1 ? 's' : ''}:
        </span>
        <span className="text-xs truncate" style={{ color: 'var(--fg-primary)' }}>
          {snapshot.research_questions[0]}
        </span>
      </div>
    );
  }

  // Phase Detection
  if (snapshot.research_phase) {
    const phase = snapshot.research_phase;
    const phaseEmoji = phaseDetectionService.getPhaseEmoji(phase.phase);
    const phaseName = phaseDetectionService.getPhaseName(phase.phase);
    const confidence = Math.round(phase.confidence * 100);

    slides.push(
      <div key="phase" className="flex items-center gap-1.5 min-w-0 min-h-[20px]">
        <span className="text-sm shrink-0">{phaseEmoji}</span>
        <span className="text-xs font-medium shrink-0" style={{ color: 'var(--fg-secondary)' }}>
          Research Phase:
        </span>
        <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
          {phaseName}
        </span>
        <span className="text-xs shrink-0" style={{ color: 'var(--fg-tertiary)' }}>
          ({confidence}%)
        </span>
      </div>
    );
  }

  // AI Insights: Summary
  if (snapshot.ai_insights?.summary) {
    slides.push(
      <div key="ai-summary" className="flex items-center gap-1.5 min-w-0 min-h-[20px]">
        <Brain className="w-3 h-3 shrink-0" style={{ color: '#8b5cf6' }} />
        <span className="text-xs font-medium shrink-0" style={{ color: 'var(--fg-secondary)' }}>
          AI Summary:
        </span>
        {renderExpandableText(snapshot.ai_insights.summary)}
      </div>
    );
  }

  // AI Insights: Struggle Areas
  if (snapshot.ai_insights?.struggle_areas && snapshot.ai_insights.struggle_areas.length > 0) {
    slides.push(
      <div key="ai-struggles" className="flex items-center gap-1.5 min-w-0 min-h-[20px]">
        <AlertCircle className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} />
        <span className="text-xs font-medium shrink-0" style={{ color: 'var(--fg-secondary)' }}>
          Struggle detected:
        </span>
        {renderExpandableText(snapshot.ai_insights.struggle_areas[0])}
      </div>
    );
  }

  // AI Insights: Suggestions
  if (snapshot.ai_insights?.suggestions && snapshot.ai_insights.suggestions.length > 0) {
    slides.push(
      <div key="ai-suggestions" className="flex items-center gap-1.5 min-w-0 min-h-[20px]">
        <Lightbulb className="w-3 h-3 shrink-0" style={{ color: '#10b981' }} />
        <span className="text-xs font-medium shrink-0" style={{ color: 'var(--fg-secondary)' }}>
          Suggestion:
        </span>
        {renderExpandableText(snapshot.ai_insights.suggestions[0])}
      </div>
    );
  }

  // Reset expansion when slide changes
  useEffect(() => {
    setIsExpanded(false);
  }, [currentSlide]);

  // Auto-rotate slides every 5 seconds (pause when expanded)
  useEffect(() => {
    if (slides.length <= 1 || isExpanded) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length, currentSlide, isExpanded]);

  // Manual navigation: click to cycle through slides
  const handleSlideClick = () => {
    if (slides.length > 1 && !isExpanded) {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }
  };

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 mb-3 rounded-lg border transition-all duration-300 ease-in-out"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
        paddingTop: isExpanded ? '0.75rem' : '0.5rem',
        paddingBottom: isExpanded ? '0.75rem' : '0.5rem',
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
        <div
          className="flex-1 min-w-0 overflow-hidden"
          onClick={handleSlideClick}
          style={{
            cursor: slides.length > 1 ? 'pointer' : 'default',
          }}
          title={slides.length > 1 ? 'Click to see next slide' : undefined}
        >
          {slides.length === 1 ? (
            // Single slide: show directly without carousel
            slides[0]
          ) : (
            // Multiple slides: use carousel
            <div
              className="transition-transform duration-500 ease-in-out flex items-center"
              style={{
                transform: `translateX(-${currentSlide * 100}%)`,
              }}
            >
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className="min-w-full flex items-center"
                  style={{ flex: '0 0 100%' }}
                >
                  {slide}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slide counter: only show if multiple slides */}
        {slides.length > 1 && (
          <div
            className="shrink-0 text-[10px] px-1.5 py-0.5 rounded"
            style={{
              color: 'var(--fg-tertiary)',
              backgroundColor: 'var(--bg-tertiary)',
            }}
          >
            {currentSlide + 1}/{slides.length}
          </div>
        )}
      </div>

      {/* Right: Actions - Continue button for current slide */}
      <div className="flex items-center gap-2 shrink-0">
        {slideActions.length > 0 && slideActions[currentSlide] ? (
          <button
            onClick={slideActions[currentSlide].handler}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer hover:opacity-90 h-[26px]"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
            }}
          >
            {slideActions[currentSlide].icon}
            {slideActions[currentSlide].label}
            <ArrowRight className="w-3 h-3" />
          </button>
        ) : (
          <div className="h-[26px]" style={{ width: '0px' }} />
        )}
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors cursor-pointer h-[26px] w-[26px] flex items-center justify-center"
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
