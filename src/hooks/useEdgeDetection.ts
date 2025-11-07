import { useEffect, useRef, useCallback } from 'react';
import type { SidebarTab } from '@/constants/sidebar';
import { LAYOUT } from '@/constants/layout';

// Sidebar animation config (MUST match CSS durations in index.css)
export const SIDEBAR_ANIMATION = {
  ENTER_DURATION: 500, // .sidebar-enter animation (ms)
  EXIT_DURATION: 400, // .sidebar-exit animation (ms)
  EXIT_BUFFER: 50, // Buffer before unmount (ms)
  get TOTAL_EXIT_TIME() {
    return this.EXIT_DURATION + this.EXIT_BUFFER; // 450ms
  },
} as const;

export const EDGE_CONFIG = {
  ZONES: {
    EDGE: LAYOUT.EDGE_ZONE,
  },
  TIMINGS: {
    SHOW_DELAY: 800,
    HIDE_DELAY: 400,
  },
  DIMENSIONS: {
    WIDTH: LAYOUT.SIDEBAR_WIDTH,
  },
} as const;

interface UseEdgeDetectionProps {
  sidebarMode: 'floating' | 'pinned';
  sidebarVisible: boolean;
  activeRibbonTab: SidebarTab | null;
  isFullPageRoute: boolean;
  setSidebarVisible: (visible: boolean) => void;
}

interface UseEdgeDetectionReturn {
  scheduleSidebarHide: (delay?: number) => void;
  cancelSidebarHide: () => void;
}

export const useEdgeDetection = ({
  sidebarMode,
  sidebarVisible,
  activeRibbonTab,
  isFullPageRoute,
  setSidebarVisible,
}: UseEdgeDetectionProps): UseEdgeDetectionReturn => {
  const hideTimerRef = useRef<number | null>(null);
  const showTimerRef = useRef<number | null>(null);

  // CRITICAL: Store current state in ref to access in handlers
  const stateRef = useRef({
    sidebarVisible,
    sidebarMode,
    isFullPageRoute,
  });

  useEffect(() => {
    stateRef.current = {
      sidebarVisible,
      sidebarMode,
      isFullPageRoute,
    };
  }, [sidebarVisible, sidebarMode, isFullPageRoute]);

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current !== null) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const setShowTimer = useCallback(() => {
    clearShowTimer();
    showTimerRef.current = window.setTimeout(() => {
      setSidebarVisible(true);
      showTimerRef.current = null;
    }, EDGE_CONFIG.TIMINGS.SHOW_DELAY);
  }, [clearShowTimer, setSidebarVisible]);

  const setHideTimer = useCallback(
    (delay: number = EDGE_CONFIG.TIMINGS.HIDE_DELAY) => {
      clearHideTimer();
      hideTimerRef.current = window.setTimeout(() => {
        setSidebarVisible(false);
        hideTimerRef.current = null;
      }, delay);
    },
    [clearHideTimer, setSidebarVisible]
  );

  const scheduleSidebarHide = useCallback(
    (delay?: number) => {
      setHideTimer(delay);
    },
    [setHideTimer]
  );

  const cancelSidebarHide = useCallback(() => {
    clearHideTimer();
  }, [clearHideTimer]);

  // MAIN EFFECT: Hold-based edge detection
  useEffect(() => {
    if (sidebarMode !== 'floating' || isFullPageRoute) return;

    const handlePointerMove = (e: PointerEvent) => {
      const currentX = e.clientX;
      const currentState = stateRef.current;

      if (currentX >= 0 && currentX <= EDGE_CONFIG.ZONES.EDGE) {
        if (!currentState.sidebarVisible && showTimerRef.current === null) {
          setShowTimer();
        }
      } else {
        if (showTimerRef.current !== null) {
          clearShowTimer();
        }
      }
    };

    const handleMouseLeave = () => {
      if (showTimerRef.current !== null) {
        clearShowTimer();
      }
      const currentState = stateRef.current;
      if (
        currentState.sidebarVisible &&
        currentState.sidebarMode === 'floating'
      ) {
        hideTimerRef.current = window.setTimeout(() => {
          setSidebarVisible(false);
          hideTimerRef.current = null;
        }, EDGE_CONFIG.TIMINGS.HIDE_DELAY);
      }
    };

    const handleWindowBlur = () => {
      const currentState = stateRef.current;
      if (
        currentState.sidebarVisible &&
        currentState.sidebarMode === 'floating'
      ) {
        hideTimerRef.current = window.setTimeout(() => {
          setSidebarVisible(false);
          hideTimerRef.current = null;
        }, EDGE_CONFIG.TIMINGS.HIDE_DELAY);
      }
      if (showTimerRef.current !== null) {
        clearShowTimer();
      }
    };

    document.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    });
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('blur', handleWindowBlur);
      clearShowTimer();
    };
  }, [
    sidebarMode,
    isFullPageRoute,
    setShowTimer,
    clearShowTimer,
    setSidebarVisible,
  ]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, []);

  return {
    scheduleSidebarHide,
    cancelSidebarHide,
  };
};
