import React, { useState, useEffect, useRef } from 'react';
import type { Highlight } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import styles from './HighlightNoteEditor.module.css';

interface HighlightNoteEditorProps {
  highlight: Highlight;
  onClose: () => void;
  onSave: (highlightId: string, note: string) => Promise<void>;
  canvasRect: DOMRect; // Canvas bounding rect for positioning
  currentScale: number; // Current viewport scale for coordinate conversion
}

/**
 * Inline popover note editor for highlights
 * Shows next to the highlight with smart positioning
 */
const HighlightNoteEditor: React.FC<HighlightNoteEditorProps> = ({
  highlight,
  onClose,
  onSave,
  canvasRect,
  currentScale,
}) => {
  const toast = useToast();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<'right' | 'left' | 'top' | 'bottom'>('right');
  const [note, setNote] = useState(highlight.note || '');
  const [isSaving, setIsSaving] = useState(false);

  // Calculate popover position based on highlight position
  useEffect(() => {
    if (!popoverRef.current) return;

    // Convert PDF coordinates to canvas coordinates
    const pdfPos = highlight.position_data;
    const canvasX = pdfPos.x * currentScale;
    const canvasY = pdfPos.y * currentScale;
    const canvasWidth = pdfPos.width * currentScale;
    const canvasHeight = pdfPos.height * currentScale;

    const popoverRect = popoverRef.current.getBoundingClientRect();
    const popoverWidth = 320; // Fixed width
    const popoverHeight = popoverRect.height || 200;
    const gap = 12; // Gap between highlight and popover
    const arrowSize = 8;

    // Highlight absolute position on screen
    const highlightScreenX = canvasRect.left + canvasX;
    const highlightScreenY = canvasRect.top + canvasY;
    const highlightScreenRight = highlightScreenX + canvasWidth;
    const highlightScreenBottom = highlightScreenY + canvasHeight;

    // Available space in each direction
    const spaceRight = window.innerWidth - highlightScreenRight;
    const spaceLeft = highlightScreenX;
    const spaceBottom = window.innerHeight - highlightScreenBottom;
    const spaceTop = highlightScreenY;

    let finalPlacement: 'right' | 'left' | 'top' | 'bottom' = 'right';
    let top = 0;
    let left = 0;

    // Smart positioning: prioritize right, then left, then bottom, then top
    if (spaceRight >= popoverWidth + gap) {
      // Place on right
      finalPlacement = 'right';
      left = highlightScreenRight + gap + arrowSize;
      top = highlightScreenY + canvasHeight / 2 - popoverHeight / 2;
    } else if (spaceLeft >= popoverWidth + gap) {
      // Place on left
      finalPlacement = 'left';
      left = highlightScreenX - popoverWidth - gap - arrowSize;
      top = highlightScreenY + canvasHeight / 2 - popoverHeight / 2;
    } else if (spaceBottom >= popoverHeight + gap) {
      // Place below
      finalPlacement = 'bottom';
      left = highlightScreenX + canvasWidth / 2 - popoverWidth / 2;
      top = highlightScreenBottom + gap + arrowSize;
    } else {
      // Place above
      finalPlacement = 'top';
      left = highlightScreenX + canvasWidth / 2 - popoverWidth / 2;
      top = highlightScreenY - popoverHeight - gap - arrowSize;
    }

    // Clamp to viewport
    top = Math.max(8, Math.min(top, window.innerHeight - popoverHeight - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8));

    setPosition({ top, left });
    setPlacement(finalPlacement);
  }, [highlight, canvasRect, currentScale]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(highlight.id, note);
      onClose();
    } catch (err) {
      console.error('Failed to save note:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save note: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className={`${styles.popover} ${styles[`popover-${placement}`]}`}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* Arrow pointing to highlight */}
      <div className={`${styles.arrow} ${styles[`arrow-${placement}`]}`} />

      <div className={styles.content}>
        <textarea
          className={styles.textarea}
          placeholder="Quick note... (Ctrl+Enter to save, Esc to cancel)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          rows={4}
        />

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button className={styles.saveButton} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HighlightNoteEditor;
