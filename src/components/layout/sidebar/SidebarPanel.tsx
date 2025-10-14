import React from 'react';
import { Pin, PinOff } from 'lucide-react';
import { SIDEBAR_HEADERS, SIDEBAR_EMPTY_STATES, type SidebarTab } from '@/constants/sidebar';
import Tooltip from '@/components/common/Tooltip';

interface SidebarPanelProps {
  activeTab: SidebarTab;
  mode: 'floating' | 'pinned';
  onTogglePin: () => void;
  onNewClick: () => void;
}

const SidebarPanel: React.FC<SidebarPanelProps> = ({
  activeTab,
  mode,
  onTogglePin,
  onNewClick,
}) => {
  return (
    <div
      className="flex flex-col flex-1"
      style={{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          borderBottom: '1px solid var(--border)',
        }}
      >
        <h2 className="text-sm font-semibold">
          {SIDEBAR_HEADERS[activeTab]}
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={onNewClick}
            className="text-xs px-2 py-1 rounded hover:bg-[var(--bg-active)] transition-colors"
          >
            New
          </button>

          <Tooltip content={mode === 'pinned' ? 'Unpin Sidebar' : 'Pin Sidebar'}>
            <button
              onClick={onTogglePin}
              className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
            >
              {mode === 'pinned' ? (
                <PinOff size={16} style={{ color: 'var(--fg-secondary)' }} />
              ) : (
                <Pin size={16} style={{ color: 'var(--fg-secondary)' }} />
              )}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-2">
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

export default SidebarPanel;
