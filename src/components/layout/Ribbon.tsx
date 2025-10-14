import React from 'react';
import { Settings } from 'lucide-react';
import { SIDEBAR_TABS, type SidebarTab } from '@/constants/sidebar';
import Tooltip from '@/components/common/Tooltip';

interface RibbonProps {
  activeTab: SidebarTab | null;
  onTabChange: (tab: SidebarTab) => void;
}

const Ribbon: React.FC<RibbonProps> = ({ activeTab, onTabChange }) => {
  const handleSettingsClick = () => {
    console.log('Opening settings');
  };

  return (
    <div
      className="flex flex-col items-center py-4 gap-4"
      style={{
        width: 'var(--ribbon-width)',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {SIDEBAR_TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <Tooltip key={tab.id} content={tab.title} placement="right">
            <button
              onClick={() => onTabChange(tab.id)}
              className={`p-2 rounded transition-colors ${
                activeTab === tab.id
                  ? 'bg-[var(--bg-active)] text-[var(--accent)]'
                  : 'hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <Icon size={20} />
            </button>
          </Tooltip>
        );
      })}

      <div className="flex-1" />

      <Tooltip content="Settings" placement="right">
        <button
          onClick={handleSettingsClick}
          className="p-2 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <Settings size={20} />
        </button>
      </Tooltip>
    </div>
  );
};

export default Ribbon;
