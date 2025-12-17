import React from 'react';
import TabBar from './TabBar';
import MainContent from './MainContent';
import type { Tab } from './TabBar';

interface ContentPanelProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabAdd?: () => void; // Optional - hide add button for secondary panel
}

/**
 * ContentPanel: Combines TabBar + MainContent
 * Used in both Layout (multiple tabs) and SplitView
 */
export const ContentPanel: React.FC<ContentPanelProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onTabAdd,
}) => {
  const activeTab = tabs.find(tab => tab.id === activeTabId);

  return (
    <div className="flex flex-col h-full w-full" style={{ minWidth: 0, overflow: 'hidden' }}>
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={onTabChange}
        onTabClose={onTabClose}
        onTabAdd={onTabAdd}
      />
      <div className="flex-1 min-h-0 relative" style={{ minWidth: 0 }}>
        <MainContent activeTab={activeTab} />
      </div>
    </div>
  );
};

export default ContentPanel;
