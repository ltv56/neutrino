import React, { useState } from 'react';
import { X, Minimize2, Check } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { sessionService } from '@/services/sessions';
import { noteService } from '@/services/notes';

interface FloatingNoteProps {}

export const FloatingNote: React.FC<FloatingNoteProps> = () => {
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleClose = async () => {
    const window = getCurrentWindow();
    await window.hide();
  };

  const handleMinimize = async () => {
    const window = getCurrentWindow();
    await window.minimize();
  };

  const generateTitle = (text: string): string => {
    if (!text.trim()) {
      const now = new Date();
      return `Quick Note - ${now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    }

    // Use first line or first 50 characters
    const firstLine = text.split('\n')[0].trim();
    return firstLine.length > 50
      ? firstLine.substring(0, 50) + '...'
      : firstLine;
  };

  const handleSave = async () => {
    if (!content.trim()) return;

    try {
      setIsSaving(true);
      setSaveSuccess(false);

      // Get or create Quick Notes session
      const quickNotesSession = await sessionService.getOrCreateQuickNotesSession();

      // Generate title from content
      const title = generateTitle(content);

      // Create note in Quick Notes session
      await noteService.create(
        quickNotesSession.id,
        null,
        title,
        content,
        'quick-capture'
      );

      // Show success and clear
      setSaveSuccess(true);
      setContent('');

      // Hide success indicator after 2 seconds
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="h-screen flex flex-col"
      style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Custom Title Bar - Same color as background */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-3 py-2 select-none"
        style={{
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
            }}
          >
            Quick Capture
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleMinimize}
            className="p-1 rounded hover:bg-[var(--bg-secondary)] transition-colors"
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <Minimize2 size={13} />
          </button>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-[var(--bg-secondary)] transition-colors"
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Main Content - Elevated Card Design */}
      <div className="flex-1 flex flex-col p-3 overflow-hidden">
        <div
          className="flex-1 flex flex-col rounded-lg overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Capture your thoughts..."
            autoFocus
            className="flex-1 w-full resize-none outline-none p-4"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              border: 'none',
              fontSize: '14px',
              lineHeight: '1.7',
            }}
          />

          {/* Bottom Bar with Actions */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{
              borderTop: '1px solid var(--border)',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                fontWeight: 500,
              }}
            >
              {saveSuccess ? (
                <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} />
                  Saved!
                </span>
              ) : (
                <span>{content.length} chars</span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                className="px-2.5 py-1 rounded transition-colors"
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent',
                }}
                onClick={() => setContent('')}
                disabled={!content.trim()}
              >
                Clear
              </button>
              <button
                className="px-3 py-1 rounded transition-colors"
                style={{
                  fontSize: '12px',
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 500,
                  opacity: !content.trim() || isSaving ? 0.5 : 1,
                  cursor: !content.trim() || isSaving ? 'not-allowed' : 'pointer',
                }}
                onClick={handleSave}
                disabled={!content.trim() || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingNote;
