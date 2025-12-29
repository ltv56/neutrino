import React, { useState, useEffect, useRef } from 'react';
import type { Highlight } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { highlightService, noteService } from '@/services';
import { Link2, X } from 'lucide-react';
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
  const [linkedNoteId, setLinkedNoteId] = useState<string | undefined>(highlight.linked_note_id);
  const [linkedNoteTitle, setLinkedNoteTitle] = useState<string>('');
  const [noteSearch, setNoteSearch] = useState('');
  const [noteOptions, setNoteOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [showNoteDropdown, setShowNoteDropdown] = useState(false);

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

  // Load linked note title if exists
  useEffect(() => {
    const loadLinkedNote = async () => {
      if (linkedNoteId) {
        try {
          const linkedNote = await noteService.getById(linkedNoteId);
          if (linkedNote) {
            setLinkedNoteTitle(linkedNote.title);
          }
        } catch (err) {
          console.error('Failed to load linked note:', err);
        }
      }
    };
    loadLinkedNote();
  }, [linkedNoteId]);

  // Search notes for autocomplete
  useEffect(() => {
    const searchNotes = async () => {
      if (noteSearch.trim().length === 0) {
        setNoteOptions([]);
        return;
      }
      try {
        const notes = await noteService.getAll();
        const filtered = notes
          .filter(n => n.title.toLowerCase().includes(noteSearch.toLowerCase()))
          .slice(0, 10);
        setNoteOptions(filtered.map(n => ({ id: n.id, title: n.title })));
      } catch (err) {
        console.error('Failed to search notes:', err);
        setNoteOptions([]);
      }
    };

    const timer = setTimeout(searchNotes, 200);
    return () => clearTimeout(timer);
  }, [noteSearch]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(highlight.id, note);

      // Handle linked note
      if (linkedNoteId && linkedNoteId !== highlight.linked_note_id) {
        await highlightService.linkToNote(highlight.id, linkedNoteId);
      } else if (!linkedNoteId && highlight.linked_note_id) {
        await highlightService.unlinkFromNote(highlight.id);
      }

      onClose();
    } catch (err) {
      console.error('Failed to save note:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save note: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkNote = (noteId: string, noteTitle: string) => {
    setLinkedNoteId(noteId);
    setLinkedNoteTitle(noteTitle);
    setNoteSearch('');
    setShowNoteDropdown(false);
  };

  const handleUnlinkNote = () => {
    setLinkedNoteId(undefined);
    setLinkedNoteTitle('');
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

        {/* Link to note section */}
        <div style={{ marginTop: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--fg-secondary)', marginBottom: '6px' }}>
            <Link2 size={14} />
            Link to note
          </label>

          {linkedNoteId ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 8px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '4px',
              border: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: '13px', color: 'var(--fg-primary)', flex: 1 }}>
                {linkedNoteTitle}
              </span>
              <button
                onClick={handleUnlinkNote}
                style={{
                  padding: '2px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--fg-tertiary)',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Unlink note"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search notes..."
                value={noteSearch}
                onChange={(e) => {
                  setNoteSearch(e.target.value);
                  setShowNoteDropdown(true);
                }}
                onFocus={() => setShowNoteDropdown(true)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '13px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--fg-primary)'
                }}
              />

              {showNoteDropdown && noteOptions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1000
                }}>
                  {noteOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => handleLinkNote(option.id, option.title)}
                      style={{
                        padding: '8px 10px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        color: 'var(--fg-primary)',
                        borderBottom: '1px solid var(--border-light)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {option.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
