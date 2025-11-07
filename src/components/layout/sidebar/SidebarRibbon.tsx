import React from 'react';
import { Settings } from 'lucide-react';
import { SIDEBAR_TABS, type SidebarTab } from '@/constants/sidebar';
import Tooltip from '@/components/common/Tooltip';

interface SidebarRibbonProps {
  activeTab: SidebarTab | null;
  onTabClick: (tab: SidebarTab) => void;
  onTabHover: (tab: SidebarTab) => void;
  onSettingsClick: () => void;
}

const SidebarRibbon: React.FC<SidebarRibbonProps> = ({
  activeTab,
  onTabClick,
  onTabHover,
  onSettingsClick,
}) => {
  return (
    <div
      className="flex flex-col items-center py-3 gap-3"
      style={{
        width: 'var(--ribbon-width)',
        backgroundColor: 'var(--bg-tertiary)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {SIDEBAR_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <Tooltip key={tab.id} content={tab.title} placement="right">
            <button
              onClick={() => onTabClick(tab.id)}
              onMouseEnter={() => onTabHover(tab.id)}
              className={`p-1.5 rounded transition-colors ${
                isActive ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-secondary)]'
              }`}
              style={{ color: isActive ? 'var(--accent)' : 'var(--fg-secondary)' }}
            >
              <Icon size={18} />
            </button>
          </Tooltip>
        );
      })}

      <div className="flex-1" />

      <Tooltip content="Settings" placement="right">
        <button
          onClick={onSettingsClick}
          className="p-1.5 rounded hover:bg-[var(--bg-secondary)] transition-colors text-secondary"
        >
          <Settings size={18} />
        </button>
      </Tooltip>
    </div>
  );
};

export default SidebarRibbon;
