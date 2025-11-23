import React from 'react';
import TabBar from './TabBar';
import MainContent from './MainContent';
import type { Tab } from './TabBar';

interface ContentPanelProps {
  // Single tab mode (for split view secondary panel)
  singleTab?: Tab;
  onCloseSingleTab?: () => void;

  // Multiple tabs mode (for main content and split view primary)
  tabs?: Tab[];
  activeTabId?: string;
  onTabChange?: (id: string) => void;
  onTabClose?: (id: string) => void;
  onTabAdd?: () => void;
}

/**
 * ContentPanel: Combines TabBar + MainContent
 * Used in both Layout (multiple tabs) and SplitView (single/multiple tabs)
 */
export const ContentPanel: React.FC<ContentPanelProps> = ({
  singleTab,
  onCloseSingleTab,
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onTabAdd,
}) => {
  // Single tab mode (split view secondary panel)
  // Use the same TabBar component but with single tab and no add button
  if (singleTab) {
    const handleCloseTab = () => {
      if (onCloseSingleTab) {
        onCloseSingleTab();
      }
    };

    return (
      <div className="flex flex-col h-full w-full" style={{ minWidth: 0, overflow: 'hidden' }}>
        <TabBar
          tabs={[singleTab]}
          activeTabId={singleTab.id}
          onTabChange={() => {}} // No-op for single tab
          onTabClose={handleCloseTab}
          onTabAdd={undefined} // No add button in single tab mode
          showCloseOnSingleTab={true} // Show close button to close split view
        />
        <div className="flex-1 min-h-0 relative" style={{ minWidth: 0 }}>
          <MainContent activeTab={singleTab} />
        </div>
      </div>
    );
  }

  // Multiple tabs mode (main content or split view primary)
  if (tabs && activeTabId) {
    const activeTab = tabs.find(tab => tab.id === activeTabId);

    return (
      <div className="flex flex-col h-full w-full" style={{ minWidth: 0, overflow: 'hidden' }}>
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={onTabChange!}
          onTabClose={onTabClose!}
          onTabAdd={onTabAdd!}
        />
        <div className="flex-1 min-h-0 relative" style={{ minWidth: 0 }}>
          <MainContent activeTab={activeTab} />
        </div>
      </div>
    );
  }

  // Fallback: no content
  return null;
};

export default ContentPanel;
