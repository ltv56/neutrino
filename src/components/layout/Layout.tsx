import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TitleBar from './TitleBar';
import TabBar from './TabBar';
import type { Tab } from './TabBar';
import Ribbon from './Ribbon';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import CommandPalette from '@/components/ui/CommandPalette';
import DebugOverlay from '@/components/debug/DebugOverlay';
import { WELCOME_TAB, createNewChatTab } from '@/constants/tabs';
import { ROUTES, SEARCH_CONTEXTS } from '@/constants/routes';
import type { SidebarTab } from '@/constants/sidebar';

const Layout: React.FC = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed
  const [previousSidebarOpen, setPreviousSidebarOpen] = useState(false); // Remember previous state
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activeRibbonTab, setActiveRibbonTab] = useState<SidebarTab | null>(null); // Start with no tab

  // Tab management
  const [tabs, setTabs] = useState<Tab[]>([WELCOME_TAB]);
  const [activeTabId, setActiveTabId] = useState('1');

  // Check if we're on a full-page route (like /sessions)
  const isFullPageRoute = location.pathname === ROUTES.SESSIONS;

  // Clear active ribbon tab when on full page routes
  useEffect(() => {
    if (isFullPageRoute) {
      setActiveRibbonTab(null);
      setSidebarOpen(false);
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

  // Handle ribbon tab change - open sidebar when tab is selected
  const handleRibbonTabChange = (tab: SidebarTab | null) => {
    if (tab === null) {
      // Deselecting tab - close sidebar
      setActiveRibbonTab(null);
      setPreviousSidebarOpen(sidebarOpen);
      setSidebarOpen(false);
    } else if (tab === activeRibbonTab) {
      // Clicking same tab - deselect it
      setActiveRibbonTab(null);
      setPreviousSidebarOpen(sidebarOpen);
      setSidebarOpen(false);
    } else {
      // Selecting new tab - open sidebar
      setActiveRibbonTab(tab);
      setSidebarOpen(true);
      setPreviousSidebarOpen(true);
    }
  };

  // Handle sidebar toggle button
  const handleSidebarToggle = () => {
    if (activeRibbonTab === null) {
      // No tab selected - button should be inactive, do nothing
      return;
    }
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    setPreviousSidebarOpen(newState);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--fg-primary)'
    }}>
      <TitleBar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Ribbon - Always visible */}
        <Ribbon
          activeTab={activeRibbonTab}
          onTabChange={setActiveRibbonTab}
        />

        {/* Sidebar Detail - Hidden on full page routes */}
        {!isFullPageRoute && sidebarOpen && (
          <Sidebar
            activeTab={activeRibbonTab}
            width={sidebarWidth}
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
