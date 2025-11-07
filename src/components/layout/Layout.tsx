import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import TitleBar from './TitleBar';
import TabBar from './TabBar';
import type { Tab } from './TabBar';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import CommandPalette from '@/components/ui/CommandPalette';
import DebugOverlay from '@/components/debug/DebugOverlay';
import { WELCOME_TAB, createNewChatTab } from '@/constants/tabs';
import { ROUTES, SEARCH_CONTEXTS } from '@/constants/routes';
import type { SidebarTab } from '@/constants/sidebar';
import { useEdgeDetection, EDGE_CONFIG } from '@/hooks/useEdgeDetection';

const Layout: React.FC = () => {
  const location = useLocation();

  // Floating sidebar state
  const [sidebarMode, setSidebarMode] = useState<'floating' | 'pinned'>('floating');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeRibbonTab, setActiveRibbonTab] = useState<SidebarTab | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Tab management
  const [tabs, setTabs] = useState<Tab[]>([WELCOME_TAB]);
  const [activeTabId, setActiveTabId] = useState('1');

  // Check if we're on a full-page route (like /sessions)
  const isFullPageRoute = location.pathname === ROUTES.SESSIONS;

  // Advanced edge detection with centralized timer management
  const { scheduleSidebarHide, cancelSidebarHide } = useEdgeDetection({
    sidebarMode,
    sidebarVisible,
    activeRibbonTab,
    isFullPageRoute,
    setSidebarVisible,
  });

  // Load saved sidebar preferences on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('neutrino_sidebar_mode') as 'floating' | 'pinned' | null;
    const savedTab = localStorage.getItem('neutrino_sidebar_tab') as SidebarTab | null;

    if (savedMode) setSidebarMode(savedMode);
    if (savedTab && savedMode === 'pinned') {
      setActiveRibbonTab(savedTab);
      setSidebarVisible(true);
    }
  }, []);

  // Clear active ribbon tab when on full page routes
  useEffect(() => {
    if (isFullPageRoute) {
      setActiveRibbonTab(null);
      setSidebarVisible(false);
    }
  }, [isFullPageRoute]);

  // Command Palette keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      // ESC to close
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addNewTab = () => {
    const newTab = createNewChatTab();
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Get search prefix for command palette
  const searchPrefix = SEARCH_CONTEXTS[location.pathname]?.prefix || '';

  // Ribbon icon hover handler
  const handleRibbonHover = (tab: SidebarTab) => {
    if (sidebarMode === 'floating' && activeRibbonTab === tab) {
      cancelSidebarHide();
    }
  };

  // Ribbon icon click handler
  const handleRibbonClick = (tab: SidebarTab) => {
    if (activeRibbonTab === tab) {
      // Toggle off - only deselect tab, keep Ribbon visible in floating mode
      setActiveRibbonTab(null);
      // In pinned mode, close sidebar. In floating mode, keep it visible
      if (sidebarMode === 'pinned') {
        setSidebarVisible(false);
      }
    } else {
      // Switch or activate
      setActiveRibbonTab(tab);
      setSidebarVisible(true);
    }
  };

  // Sidebar mouse enter handler (cancel hide timer)
  const handleSidebarEnter = () => {
    cancelSidebarHide();
  };

  // Sidebar mouse leave handler (floating mode only)
  const handleSidebarLeave = (e: React.MouseEvent) => {
    if (sidebarMode === 'floating') {
      scheduleSidebarHide();
    }
  };

  // Pin/Unpin toggle
  const handleTogglePin = () => {
    const newMode = sidebarMode === 'pinned' ? 'floating' : 'pinned';
    setSidebarMode(newMode);
    localStorage.setItem('neutrino_sidebar_mode', newMode);

    if (newMode === 'pinned') {
      // Pinning: Always show sidebar and save active tab
      setSidebarVisible(true);
      localStorage.setItem('neutrino_sidebar_tab', activeRibbonTab || '');
    } else {
      // Unpinning: Keep sidebar visible, will auto-hide when mouse leaves
      // This makes the transition smooth and lets user see the mode changed
      setSidebarVisible(true);
      cancelSidebarHide(); // Cancel any pending hide timers
    }
  };

  // Edge indicator click - show sidebar instantly
  const handleIndicatorClick = () => {
    setSidebarVisible(true);
    cancelSidebarHide();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--fg-primary)'
    }}>
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (includes Ribbon) - Hidden on full page routes */}
        {!isFullPageRoute && (
          <Sidebar
            mode={sidebarMode}
            isVisible={sidebarVisible}
            activeTab={activeRibbonTab}
            onTogglePin={handleTogglePin}
            onTabClick={handleRibbonClick}
            onTabHover={handleRibbonHover}
            onMouseEnter={handleSidebarEnter}
            onMouseLeave={handleSidebarLeave}
            onIndicatorClick={handleIndicatorClick}
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {!isFullPageRoute && (
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onTabChange={setActiveTabId}
              onTabClose={closeTab}
              onTabAdd={addNewTab}
            />
          )}
          <MainContent activeTab={activeTab} />
        </div>
      </div>
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        initialPrefix={searchPrefix}
      />
      <DebugOverlay />
    </div>
  );
};

export default Layout;
