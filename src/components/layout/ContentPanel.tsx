import React from 'react';
import TabBar from './TabBar';
import MainContent from './MainContent';
import type { Tab } from './TabBar';

interface ContentPanelProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onTabClose: (id: string) => void;
  showCloseOnSingleTab?: boolean; // Optional - show close button even with single tab
  isRightmost?: boolean; // Reserve space for toolbar buttons if rightmost panel
  isFocused?: boolean; // Visual indicator for focused panel
  onFocus?: () => void; // Callback when panel receives focus
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
  showCloseOnSingleTab,
  isRightmost = true,
  isFocused = true,
  onFocus,
}) => {
  const activeTab = tabs.find(tab => tab.id === activeTabId);

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ minWidth: 0, overflow: 'hidden' }}
      onMouseDown={onFocus} // Track any click in this panel
    >
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={onTabChange}
        onTabClose={onTabClose}
        showCloseOnSingleTab={showCloseOnSingleTab}
        isRightmost={isRightmost}
        isFocused={isFocused}
      />
      <div className="flex-1 min-h-0 relative" style={{ minWidth: 0 }}>
        <MainContent activeTab={activeTab} isFocused={isFocused} />
      </div>
    </div>
  );
};

export default ContentPanel;
