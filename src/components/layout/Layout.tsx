import React, { useState, useEffect } from 'react';
import TitleBar from './TitleBar';
import TabBar from './TabBar';
import type { Tab } from './TabBar';
import { Sidebar } from '@/components/sidebar';
import MainContent from './MainContent';
import CommandPalette from '@/components/ui/CommandPalette';
import DebugOverlay from '@/components/ui/DebugOverlay';
import { WELCOME_TAB, createNewChatTab } from '@/constants/tabs';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Tab management
  const [tabs, setTabs] = useState<Tab[]>([WELCOME_TAB]);
  const [activeTabId, setActiveTabId] = useState('1');

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
        <Sidebar
          isOpen={sidebarOpen}
          width={sidebarWidth}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={setActiveTabId}
            onTabClose={closeTab}
            onTabAdd={addNewTab}
          />
          <MainContent activeTab={activeTab} />
        </div>
      </div>
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
      <DebugOverlay />
    </div>
  );
};

export default Layout;
