import { useState, useEffect } from 'react';
import type { SidebarTab } from '@/constants/sidebar';

interface UseSidebarModeProps {
  isFullPageRoute: boolean;
}

interface UseSidebarModeReturn {
  sidebarMode: 'floating' | 'pinned';
  sidebarVisible: boolean;
  activeRibbonTab: SidebarTab;
  handleTogglePin: () => void;
  handleRibbonClick: (tab: SidebarTab) => void;
  setSidebarVisible: (visible: boolean) => void;
}

/**
 * Custom hook to manage sidebar mode, visibility, and active tab
 * Handles pin/unpin transitions with smooth animations
 */
export const useSidebarMode = ({
  isFullPageRoute,
}: UseSidebarModeProps): UseSidebarModeReturn => {
  const [sidebarMode, setSidebarMode] = useState<'floating' | 'pinned'>('floating');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeRibbonTab, setActiveRibbonTab] = useState<SidebarTab>('documents');

  // Load saved sidebar mode on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('neutrino_sidebar_mode') as 'floating' | 'pinned' | null;
    if (savedMode) {
      setSidebarMode(savedMode);
      if (savedMode === 'pinned') setSidebarVisible(true);
    }
  }, []);

  // Hide sidebar on full page routes
  useEffect(() => {
    if (isFullPageRoute) {
      setSidebarVisible(false);
    }
  }, [isFullPageRoute]);

  // Ribbon icon click handler
  const handleRibbonClick = (tab: SidebarTab) => {
    if (activeRibbonTab === tab) {
      // Same tab clicked - toggle visibility
      setSidebarVisible(!sidebarVisible);
    } else {
      // Different tab - switch and show
      setActiveRibbonTab(tab);
      setSidebarVisible(true);
    }
  };

  // Pin/Unpin toggle with smooth animation
  const handleTogglePin = () => {
    if (sidebarMode === 'pinned') {
      // Unpinning: Switch to floating first (for animation), then hide
      setSidebarMode('floating');
      localStorage.setItem('neutrino_sidebar_mode', 'floating');

      // Small delay to let mode switch apply, then trigger slide out
      requestAnimationFrame(() => {
        setSidebarVisible(false);
      });
    } else {
      // Pinning: Switch to pinned and show sidebar
      setSidebarMode('pinned');
      setSidebarVisible(true);
      localStorage.setItem('neutrino_sidebar_mode', 'pinned');
    }
  };

  return {
    sidebarMode,
    sidebarVisible,
    activeRibbonTab,
    handleTogglePin,
    handleRibbonClick,
    setSidebarVisible,
  };
};
