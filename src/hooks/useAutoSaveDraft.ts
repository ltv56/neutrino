import { useEffect, useRef } from 'react';
import { draftStorage } from '@/services/draftStorage';

/**
 * Hook to auto-save draft content with debouncing
 */
export const useAutoSaveDraft = (
  content: string,
  currentNoteId: string | null,
  currentDraftId: string | null,
  debounceMs: number = 1000
) => {
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
    }

    // Only save draft if it's not a saved note or saved draft being edited
    if (!currentNoteId && !currentDraftId && content.trim()) {
      draftTimerRef.current = setTimeout(() => {
        draftStorage.saveDraft(content);
      }, debounceMs);
    }

    return () => {
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
      }
    };
  }, [content, currentNoteId, currentDraftId, debounceMs]);
};
