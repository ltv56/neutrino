import React from 'react';
import { SIDEBAR_HEADERS, SIDEBAR_EMPTY_STATES, type SidebarTab } from '@/constants/sidebar';

interface SidebarPanelProps {
  activeTab: SidebarTab;
  mode: 'floating' | 'pinned';
  onNewClick: () => void;
}

const SidebarPanel: React.FC<SidebarPanelProps> = ({
  activeTab,
  mode,
  onNewClick,
}) => {
  return (
    <div
      className="flex flex-col flex-1"
      style={{
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      {/* Content List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-2">
          <div className="space-y-1">
            <div className="p-2 rounded text-sm cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors text-secondary">
              <div className="font-medium text-primary">
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

export default SidebarPanel;
