import React from 'react';
import {
  SIDEBAR_HEADERS,
  SIDEBAR_EMPTY_STATES,
  type SidebarTab
} from '@/constants/sidebar';

interface SidebarProps {
  activeTab: SidebarTab | null;
  width: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, width }) => {
  if (!activeTab) return null;
  const handleNewClick = () => {
    console.log(`Creating new ${activeTab}`);
  };

  return (
    <div
      className="flex flex-col"
      style={{
        width: `${width}px`,
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h2 className="text-sm font-semibold">
          {SIDEBAR_HEADERS[activeTab]}
        </h2>
        <button
          onClick={handleNewClick}
          className="text-xs px-2 py-1 rounded hover:bg-[var(--bg-active)] transition-colors"
        >
          New
        </button>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2">
          <div className="space-y-1">
            <div
              className="p-2 rounded text-sm cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
              style={{ color: 'var(--fg-secondary)' }}
            >
              <div className="font-medium" style={{ color: 'var(--fg-primary)' }}>
                {SIDEBAR_EMPTY_STATES[activeTab].title}
              </div>
              <div className="text-xs mt-1">
                {SIDEBAR_EMPTY_STATES[activeTab].subtitle}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
