import React from 'react';
import { X, Plus } from 'lucide-react';

export interface Tab {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd: () => void;
}

const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onTabAdd,
}) => {
  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    onTabClose(tabId);
  };

  return (
    <div
      className="flex items-stretch"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        height: 'var(--tabbar-height)',
      }}
    >
      <div className="flex items-center overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="group flex items-center gap-2 px-2 h-full cursor-pointer border-r transition-colors"
            style={{
              backgroundColor: activeTabId === tab.id ? 'var(--bg-primary)' : 'transparent',
              borderRightColor: 'var(--border)',
              borderBottom: activeTabId === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            <span className="text-sm whitespace-nowrap">
              {tab.title}
            </span>
            {tabs.length > 1 && (
              <button
                onClick={(e) => handleCloseTab(tab.id, e)}
                className="opacity-0 group-hover:opacity-100 rounded hover:bg-[var(--bg-active)] transition-opacity"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onTabAdd}
        className="p-1 mx-1 rounded hover:bg-[var(--bg-active)] transition-colors"
        title="New Tab"
      >
        <Plus size={18} />
      </button>
    </div>
  );
};

export default TabBar;