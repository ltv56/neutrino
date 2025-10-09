import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import {
  SIDEBAR_TABS,
  SIDEBAR_HEADERS,
  SIDEBAR_EMPTY_STATES,
  type SidebarTab
} from '@/constants/sidebar';

interface SidebarProps {
  isOpen: boolean;
  width: number;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, width, onToggle }) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('sessions');

  const handleNewClick = () => {
    console.log(`Creating new ${activeTab === 'sessions' ? 'session' : 'document'}`);
  };

  const handleSettingsClick = () => {
    console.log('Opening settings');
  };

  return (
    <>
      {/* Left Ribbon */}
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
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-2 rounded transition-colors ${
                activeTab === tab.id && isOpen
                  ? 'bg-[var(--bg-active)] text-[var(--accent)]'
                  : 'hover:bg-[var(--bg-tertiary)]'
              }`}
              title={tab.title}
            >
              <Icon size={20} />
            </button>
          );
        })}

        <div className="flex-1" />

        <button
          onClick={handleSettingsClick}
          className="p-2 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Sidebar Content */}
      {isOpen && (
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
          <div className="flex-1 overflow-y-auto px-2">
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
      )}
    </>
  );
};

export default Sidebar;
