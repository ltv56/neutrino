import React, { useState, useRef, useCallback } from 'react';

interface SplitViewProps {
  primaryContent: React.ReactNode;
  secondaryContent: React.ReactNode;
  defaultRatio?: number; // 0-100, percentage for primary panel
}

export const SplitView: React.FC<SplitViewProps> = ({
  primaryContent,
  secondaryContent,
  defaultRatio = 50,
}) => {
  const [ratio, setRatio] = useState(defaultRatio);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newRatio = (x / rect.width) * 100;

    // Constrain ratio between 20% and 80%
    if (newRatio >= 20 && newRatio <= 80) {
      setRatio(newRatio);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove event listeners for drag
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full"
      style={{ position: 'relative', minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}
    >
      {/* Primary Panel */}
      <div
        style={{
          width: `${ratio}%`,
          height: '100%',
          overflow: 'hidden',
          minWidth: 0, // Allow content to shrink
          flexShrink: 1, // Allow panel to shrink
        }}
      >
        {primaryContent}
      </div>

      {/* Resize Handle */}
      <div
        style={{
          width: '4px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {/* Spacer for TabBar height - no interaction */}
        <div style={{ height: 'var(--tabbar-height)', flexShrink: 0 }} />

        {/* Actual resize handle - aligned with MainContent */}
        <div
          className="resize-handle"
          onMouseDown={handleMouseDown}
          style={{
            flex: 1,
            backgroundColor: isDragging ? 'var(--accent)' : 'var(--border)',
            transition: isDragging ? 'none' : 'background-color 0.2s',
            marginTop: '8px', // Padding for top border radius
            marginBottom: '8px', // Padding for bottom border radius
            position: 'relative',
            cursor: 'col-resize',
          }}
        >
          {/* Hover area for easier grabbing - contained within handle */}
          <div
            style={{
              position: 'absolute',
              left: '-4px',
              right: '-4px',
              top: 0,
              bottom: 0,
              cursor: 'col-resize',
            }}
          />
        </div>
      </div>

      {/* Secondary Panel */}
      <div
        style={{
          width: `${100 - ratio}%`,
          height: '100%',
          overflow: 'hidden',
          minWidth: 0, // Allow content to shrink
          flexShrink: 1, // Allow panel to shrink
        }}
      >
        {secondaryContent}
      </div>
    </div>
  );
};

export default SplitView;
