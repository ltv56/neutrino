import React, { type RefObject, useEffect } from 'react';
import { draftStorage, type Draft } from '@/services/draftStorage';
import { DraftItem } from './DraftItem';

interface RecentDraftsDropdownProps {
  showRecentMenu: boolean;
  recentMenuRef: RefObject<HTMLDivElement | null>;
  recentButtonRef: RefObject<HTMLButtonElement | null>;
  currentDraftId: string | null;
  savedDrafts: Draft[];
  loadDraft: (draft: Draft) => void;
  loadSavedDrafts: () => void;
  setShowRecentMenu: (show: boolean) => void;
}

export const RecentDraftsDropdown: React.FC<RecentDraftsDropdownProps> = ({
  showRecentMenu,
  recentMenuRef,
  recentButtonRef,
  currentDraftId,
  savedDrafts,
  loadDraft,
  loadSavedDrafts,
  setShowRecentMenu,
}) => {
  // Format datetime for display
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        recentMenuRef.current &&
        recentButtonRef.current &&
        !recentMenuRef.current.contains(event.target as Node) &&
        !recentButtonRef.current.contains(event.target as Node)
      ) {
        setShowRecentMenu(false);
      }
    };

    if (showRecentMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRecentMenu, recentMenuRef, recentButtonRef, setShowRecentMenu]);

  if (!showRecentMenu) return null;

  return (
    <div
      ref={recentMenuRef}
      className="absolute right-0 mt-1 rounded shadow-lg"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        minWidth: '280px',
        maxHeight: '360px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        zIndex: 10000,
      }}
    >
      {/* Menu Header */}
      <div
        className="px-3 py-2"
        style={{
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Recent Drafts
        </div>
        <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
          Auto-delete after 30 days
        </div>
      </div>

      {/* Drafts List */}
      <div style={{ overflowY: 'auto', maxHeight: '280px' }}>
        {savedDrafts.map((draft) => (
          <DraftItem
            key={draft.id}
            title={draft.title}
            datetime={draft.timestamp ? formatDateTime(new Date(draft.timestamp).toISOString()) : undefined}
            isActive={currentDraftId === draft.id}
            onClick={() => loadDraft(draft)}
            onRemove={() => {
              draftStorage.removeDraft(draft.id);
              loadSavedDrafts();
            }}
          />
        ))}

        {/* Empty State */}
        {savedDrafts.length === 0 && (
          <div className="p-3 text-center" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            No drafts yet
          </div>
        )}
      </div>
    </div>
  );
};
