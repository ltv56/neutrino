import { useEffect, useCallback } from 'react';
import { tabStateService, type WorkspaceState } from '@/services/tabState';

/**
 * Simple hook to auto-save workspace state
 * Saves on beforeunload event
 */
export const useTabStatePersistence = (getState: () => WorkspaceState) => {
  const saveState = useCallback(() => {
    const state = getState(); // Get fresh state with current positions
    tabStateService.saveState(state);
  }, [getState]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveState();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveState]);

  return {
    saveNow: () => {
      const state = getState();
      console.log('[useTabStatePersistence] Saving state:', state);
      tabStateService.saveState(state);
    },
    clearState: () => tabStateService.clearState(),
  };
};
