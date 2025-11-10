import React, { useState, useEffect } from 'react';
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
import { useEdgeDetection, useSidebarMode } from '@/hooks';

const Layout: React.FC = () => {
  const location = useLocation();

  // Tab management
  const [tabs, setTabs] = useState<Tab[]>([WELCOME_TAB]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Vault panel state
  const [isVaultOpen, setIsVaultOpen] = useState(false);

  // Check if we're on a full-page route (like /sessions)
  const isFullPageRoute = location.pathname === ROUTES.SESSIONS;

  // Sidebar mode management
  const {
    sidebarMode,
    sidebarVisible,
    activeRibbonTab,
    handleTogglePin,
    handleRibbonClick,
    setSidebarVisible,
  } = useSidebarMode({
    isFullPageRoute,
  });

  // Edge detection with centralized timer management
  const { scheduleSidebarHide, cancelSidebarHide } = useEdgeDetection({
    sidebarMode,
    sidebarVisible,
    activeRibbonTab,
    isFullPageRoute,
    setSidebarVisible,
  });

  // Ribbon icon hover handler
  const handleRibbonHover = (tab: SidebarTab) => {
    if (sidebarMode === 'floating' && activeRibbonTab === tab) {
      cancelSidebarHide();
    }
  };

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
      <TitleBar
        sidebarMode={sidebarMode}
        onToggleSidebarPin={handleTogglePin}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (includes Vault + Session panels) */}
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
            isVaultOpen={isVaultOpen}
            onToggleVault={() => setIsVaultOpen(!isVaultOpen)}
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
