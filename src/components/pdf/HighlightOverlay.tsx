import React, { useState } from 'react';
import type { Highlight } from '@/types';
import { DEFAULT_HIGHLIGHT_COLOR, DEFAULT_HIGHLIGHT_OPACITY } from '@/constants/highlight';
import { X, Pencil, Link2, FileText } from 'lucide-react';

interface HighlightOverlayProps {
  highlights: Highlight[];
  canvasWidth: number;
  canvasHeight: number;
  currentScale: number; // Current viewport scale for coordinate conversion
  toolMode: 'select' | 'highlight'; // Current tool mode affects pointer events
  onHighlightClick?: (highlight: Highlight) => void;
  onHighlightDelete?: (highlight: Highlight) => void;
}

/**
 * SVG overlay that renders highlights on top of PDF canvas
 * Highlights are stored in PDF coordinates (scale 1.0) and scaled to canvas coordinates for display
 */
const HighlightOverlay: React.FC<HighlightOverlayProps> = ({
  highlights,
  canvasWidth,
  canvasHeight,
  currentScale,
  toolMode,
  onHighlightClick,
  onHighlightDelete,
}) => {
  const [hoveredHighlight, setHoveredHighlight] = useState<Highlight | null>(null);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (highlight: Highlight) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredHighlight(highlight);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredHighlight(null);
    }, 100);
  };

  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  if (highlights.length === 0) {
    return null;
  }

  return (
    <>
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: '16px',
          width: canvasWidth,
          height: canvasHeight,
          pointerEvents: 'none',
          zIndex: 3,
        }}
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Shadow filter for delete button */}
          <filter id="delete-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="0" dy="1" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Shadow filter for edit button */}
          <filter id="edit-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="0" dy="1" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {highlights.map((highlight) => {
          const pdfPos = highlight.position_data;
          const color = highlight.metadata?.color || DEFAULT_HIGHLIGHT_COLOR;
          const hasNote = Boolean(highlight.note);
          const hasLinkedNote = Boolean(highlight.linked_note_id);

          // Support both single rect (old) and multi-rect (new) formats
          const rects = pdfPos.rects || [{ x: pdfPos.x!, y: pdfPos.y!, width: pdfPos.width!, height: pdfPos.height! }];

          // Convert to canvas coordinates
          const canvasRects = rects.map(r => ({
            x: r.x * currentScale,
            y: r.y * currentScale,
            width: r.width * currentScale,
            height: r.height * currentScale,
          }));

          // Use first and last rect for icon positioning (not bounding box)
          const firstRect = canvasRects[0];
          const lastRect = canvasRects[canvasRects.length - 1];

          // Calculate bounding box for hover detection area
          const minX = Math.min(...canvasRects.map(r => r.x));
          const minY = Math.min(...canvasRects.map(r => r.y));
          const maxX = Math.max(...canvasRects.map(r => r.x + r.width));
          const maxY = Math.max(...canvasRects.map(r => r.y + r.height));

          return (
            <g key={highlight.id}>
              {/* Render multiple rectangles for accurate highlighting */}
              {canvasRects.map((rect, idx) => (
                <rect
                  key={`${highlight.id}-${idx}`}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  fill={color}
                  opacity={0.6}
                  style={{
                    pointerEvents: toolMode === 'select' ? 'none' : 'auto',
                    cursor: toolMode === 'select' ? 'default' : 'pointer',
                    mixBlendMode: 'multiply',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onHighlightClick?.(highlight);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onHighlightDelete?.(highlight);
                  }}
                />
              ))}

              {/* Invisible hover detection area - includes highlight + button area */}
              {toolMode === 'select' && (
                <rect
                  x={minX - 4}
                  y={minY - 4}
                  width={(maxX - minX) + 60}
                  height={(maxY - minY) + 8}
                  fill="transparent"
                  stroke="transparent"
                  style={{
                    pointerEvents: 'auto',
                    cursor: 'default',
                  }}
                  onMouseEnter={() => handleMouseEnter(highlight)}
                  onMouseLeave={handleMouseLeave}
                />
              )}

              {/* Hover events for highlight mode */}
              {toolMode === 'highlight' && (
                <rect
                  x={minX}
                  y={minY}
                  width={(maxX - minX) + 60}
                  height={maxY - minY}
                  fill="transparent"
                  style={{
                    pointerEvents: 'auto',
                  }}
                  onMouseEnter={() => handleMouseEnter(highlight)}
                  onMouseLeave={handleMouseLeave}
                />
              )}

              {/* Action buttons - positioned at maxX (rightmost edge), vertically at last rect */}
              {hoveredHighlight?.id === highlight.id && (
                <g
                  onMouseEnter={() => handleMouseEnter(highlight)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Invisible hover area for buttons */}
                  <rect
                    x={maxX}
                    y={lastRect.y + lastRect.height / 2 - 35}
                    width="30"
                    height="70"
                    fill="transparent"
                    style={{ pointerEvents: 'auto' }}
                  />

                  {/* Delete button (at rightmost edge) */}
                  <g filter="url(#delete-shadow)">
                    <circle
                      cx={maxX + 8}
                      cy={lastRect.y + lastRect.height / 2}
                      r="10"
                      fill="#dc2626"
                      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onHighlightDelete?.(highlight);
                      }}
                    />
                  </g>
                  <foreignObject
                    x={maxX + 8 - 7}
                    y={lastRect.y + lastRect.height / 2 - 7}
                    width="14"
                    height="14"
                    style={{ pointerEvents: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                      <X size={12} color="white" strokeWidth={2.5} />
                    </div>
                  </foreignObject>

                  {/* Edit button (at rightmost edge, above delete) */}
                  <g filter="url(#edit-shadow)">
                    <circle
                      cx={maxX + 8}
                      cy={lastRect.y + lastRect.height / 2 - 24}
                      r="10"
                      fill="#15803d"
                      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onHighlightClick?.(highlight);
                      }}
                    />
                  </g>
                  <foreignObject
                    x={maxX + 8 - 6}
                    y={lastRect.y + lastRect.height / 2 - 24 - 6}
                    width="12"
                    height="12"
                    style={{ pointerEvents: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                      <Pencil size={11} color="white" strokeWidth={2.5} />
                    </div>
                  </foreignObject>
                </g>
              )}

              {/* Linked note indicator icon (top-left of first rect) */}
              {hasLinkedNote && (
                <g>
                  <circle
                    cx={firstRect.x + 6}
                    cy={firstRect.y + 6}
                    r="5"
                    fill="var(--accent)"
                    stroke="white"
                    strokeWidth="1.2"
                  />
                  <foreignObject
                    x={firstRect.x + 6 - 4}
                    y={firstRect.y + 6 - 4}
                    width="8"
                    height="8"
                    style={{ pointerEvents: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                      <Link2 size={7} color="white" strokeWidth={2.5} />
                    </div>
                  </foreignObject>
                </g>
              )}

              {/* Note indicator icon (top-right of first rect) */}
              {hasNote && (
                <g>
                  <circle
                    cx={firstRect.x + firstRect.width - 6}
                    cy={firstRect.y + 6}
                    r="5"
                    fill="var(--bg-secondary)"
                    stroke="var(--accent)"
                    strokeWidth="1.2"
                  />
                  <foreignObject
                    x={firstRect.x + firstRect.width - 6 - 4}
                    y={firstRect.y + 6 - 4}
                    width="8"
                    height="8"
                    style={{ pointerEvents: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                      <FileText size={7} style={{ color: 'var(--accent)' }} strokeWidth={2.5} />
                    </div>
                  </foreignObject>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip for note preview on hover */}
      {hoveredHighlight?.note && (() => {
        // Convert PDF coordinates to canvas coordinates
        const pdfPos = hoveredHighlight.position_data;
        const rects = pdfPos.rects || [{ x: pdfPos.x!, y: pdfPos.y!, width: pdfPos.width!, height: pdfPos.height! }];

        const canvasRects = rects.map(r => ({
          x: r.x * currentScale,
          y: r.y * currentScale,
          width: r.width * currentScale,
          height: r.height * currentScale,
        }));

        const lastRect = canvasRects[canvasRects.length - 1];
        const maxX = Math.max(...canvasRects.map(r => r.x + r.width));

        const tooltipWidth = 280;
        const gap = 12;
        const buttonWidth = 28; // Width of button area (10px radius + 8px offset)

        // Position tooltip to the right of buttons
        const left = maxX + buttonWidth + gap;

        // Vertically align with the middle of the last rect
        const top = lastRect.y + lastRect.height / 2 - 60; // Approximate center of tooltip

        return (
          <div
            style={{
              position: 'absolute',
              left: `${16 + left}px`, // Add canvas offset
              top: `${top}px`,
              width: `${tooltipWidth}px`,
              padding: '12px 14px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
              color: 'var(--fg-primary)',
              fontSize: '13px',
              lineHeight: '1.6',
              pointerEvents: 'none',
              zIndex: 998,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            <div style={{
              fontSize: '10px',
              color: 'var(--fg-secondary)',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600,
            }}>
              Note
            </div>
            {hoveredHighlight.note.length > 150
              ? `${hoveredHighlight.note.slice(0, 150)}...`
              : hoveredHighlight.note}
          </div>
        );
      })()}
    </>
  );
};

export default HighlightOverlay;
