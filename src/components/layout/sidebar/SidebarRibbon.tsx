import React from 'react';
import { Settings, FolderOpen } from 'lucide-react';
import { SIDEBAR_TABS, type SidebarTab } from '@/constants/sidebar';
import Tooltip from '@/components/common/Tooltip';

interface SidebarRibbonProps {
  activeTab: SidebarTab | null;
  onTabClick: (tab: SidebarTab) => void;
  onTabHover: (tab: SidebarTab) => void;
  onSettingsClick: () => void;
  isVaultOpen?: boolean;
  onVaultClick?: () => void;
}

const SidebarRibbon: React.FC<SidebarRibbonProps> = ({
  activeTab,
  onTabClick,
  onTabHover,
  onSettingsClick,
  isVaultOpen,
  onVaultClick,
}) => {
  return (
    <div
      className="flex flex-col items-center py-3 gap-2"
      style={{
        width: 'var(--ribbon-width)',
        backgroundColor: 'var(--bg-background)',
        borderRight: '1px solid var(--border-light)',
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
              className={`p-1.5 rounded-md transition-colors ${
                isActive ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-tertiary)]'
              }`}
              style={{ color: isActive ? 'var(--accent)' : 'var(--fg-secondary)' }}
            >
              <Icon size={18} />
            </button>
          </Tooltip>
        );
      })}

      <div className="flex-1" />

      {/* Vault Toggle */}
      {onVaultClick && (
        <Tooltip content={isVaultOpen ? 'Close Vault' : 'Open Vault'} placement="right">
          <button
            onClick={onVaultClick}
            className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
            style={{ color: isVaultOpen ? 'var(--accent)' : 'var(--fg-secondary)' }}
          >
            <FolderOpen size={18} />
          </button>
        </Tooltip>
      )}

      {/* Settings */}
      <Tooltip content="Settings" placement="right">
        <button
          onClick={onSettingsClick}
          className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-secondary"
        >
          <Settings size={18} />
        </button>
      </Tooltip>
    </div>
  );
};

export default SidebarRibbon;
