import { useState, useEffect } from 'react';
import type { SidebarTab } from '@/constants/sidebar';

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
export const useSidebarMode = (): UseSidebarModeReturn => {
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
      // Same update as the mode switch: a later hide left a frame with a fully visible floating sidebar
      setSidebarMode('floating');
      setSidebarVisible(false);
      localStorage.setItem('neutrino_sidebar_mode', 'floating');
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
