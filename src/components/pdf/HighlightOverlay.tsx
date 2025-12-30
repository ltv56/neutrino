import React, { useState } from 'react';
import type { Highlight } from '@/types';
import { DEFAULT_HIGHLIGHT_COLOR, DEFAULT_HIGHLIGHT_OPACITY } from '@/constants/highlight';

interface HighlightOverlayProps {
  highlights: Highlight[];
  canvasWidth: number;
  canvasHeight: number;
  currentScale: number; // Current viewport scale for coordinate conversion
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
  onHighlightClick,
  onHighlightDelete,
}) => {
  const [hoveredHighlight, setHoveredHighlight] = useState<Highlight | null>(null);
  if (highlights.length === 0) {
    return null;
  }

  return (
    <>
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: canvasWidth,
          height: canvasHeight,
          pointerEvents: 'none',
        }}
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {highlights.map((highlight) => {
          // Convert PDF coordinates (scale 1.0) to canvas coordinates (current scale)
          const pdfPos = highlight.position_data;
          const canvasX = pdfPos.x * currentScale;
          const canvasY = pdfPos.y * currentScale;
          const canvasWidth = pdfPos.width * currentScale;
          const canvasHeight = pdfPos.height * currentScale;

          const color = highlight.metadata?.color || DEFAULT_HIGHLIGHT_COLOR;
          const hasNote = Boolean(highlight.note);
          const hasLinkedNote = Boolean(highlight.linked_note_id);

          return (
            <g key={highlight.id}>
              {/* Highlight rectangle */}
              <rect
                x={canvasX}
                y={canvasY}
                width={canvasWidth}
                height={canvasHeight}
                fill={color}
                opacity={DEFAULT_HIGHLIGHT_OPACITY}
                style={{
                  pointerEvents: 'auto',
                  cursor: 'pointer',
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
                onMouseEnter={() => setHoveredHighlight(highlight)}
                onMouseLeave={() => setHoveredHighlight(null)}
              />

              {/* Linked note indicator icon (top-left) */}
              {hasLinkedNote && (
                <g>
                  {/* Icon background circle */}
                  <circle
                    cx={canvasX + 8}
                    cy={canvasY + 8}
                    r="7"
                    fill="var(--accent)"
                    stroke="var(--bg-secondary)"
                    strokeWidth="1.5"
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* Link icon */}
                  <text
                    x={canvasX + 8}
                    y={canvasY + 8}
                    fontSize="9"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 'bold' }}
                  >
                    🔗
                  </text>
                </g>
              )}

              {/* Note indicator icon (top-right) */}
              {hasNote && (
                <g>
                  {/* Icon background circle */}
                  <circle
                    cx={canvasX + canvasWidth - 8}
                    cy={canvasY + 8}
                    r="7"
                    fill="var(--bg-secondary)"
                    stroke="var(--border)"
                    strokeWidth="1"
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* Note icon (simplified pen/pencil) */}
                  <text
                    x={canvasX + canvasWidth - 8}
                    y={canvasY + 8}
                    fontSize="10"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="var(--fg-primary)"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    📝
                  </text>
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
        const canvasX = pdfPos.x * currentScale;
        const canvasY = pdfPos.y * currentScale;
        const highlightCanvasWidth = pdfPos.width * currentScale;
        const highlightCanvasHeight = pdfPos.height * currentScale;

        const tooltipWidth = 280;
        const tooltipHeightEstimate = 100; // Rough estimate
        const gap = 10;

        // Prioritize top/bottom placement to avoid covering highlight
        const fitsAbove = canvasY - gap - tooltipHeightEstimate >= 0;
        const fitsBelow = canvasY + highlightCanvasHeight + gap + tooltipHeightEstimate <= canvasHeight;

        let top;
        if (fitsBelow) {
          // Place below highlight (preferred)
          top = canvasY + highlightCanvasHeight + gap;
        } else if (fitsAbove) {
          // Place above highlight
          top = canvasY - tooltipHeightEstimate - gap;
        } else {
          // Fallback: place below anyway
          top = canvasY + highlightCanvasHeight + gap;
        }

        // Center tooltip horizontally with highlight, but clamp to canvas bounds
        let left = canvasX + (highlightCanvasWidth / 2) - (tooltipWidth / 2);
        left = Math.max(gap, Math.min(left, canvasWidth - tooltipWidth - gap));

        return (
          <div
            style={{
              position: 'absolute',
              left: `${left}px`,
              top: `${top}px`,
              width: `${tooltipWidth}px`,
              padding: '10px 12px',
              backgroundColor: '#202020',
              border: '1px solid #2c2c2c',
              borderRadius: '6px',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.5)',
              color: '#ededed',
              fontSize: '12px',
              lineHeight: '1.5',
              pointerEvents: 'none',
              zIndex: 998,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            <div style={{
              fontSize: '10px',
              color: '#a3a3a3',
              marginBottom: '4px',
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
