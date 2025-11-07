import React from 'react';
import { type SidebarTab } from '@/constants/sidebar';
import EdgeIndicator from './sidebar/EdgeIndicator';
import SidebarBackdrop from './sidebar/SidebarBackdrop';
import SidebarRibbon from './sidebar/SidebarRibbon';
import SidebarPanel from './sidebar/SidebarPanel';
import { useSidebarAnimation } from '@/hooks';

interface SidebarProps {
  mode: 'floating' | 'pinned';
  isVisible: boolean;
  activeTab: SidebarTab | null;
  onTogglePin: () => void;
  onTabClick: (tab: SidebarTab) => void;
  onTabHover: (tab: SidebarTab) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onIndicatorClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  mode,
  isVisible,
  activeTab,
  onTogglePin,
  onTabClick,
  onTabHover,
  onMouseEnter,
  onMouseLeave,
  onIndicatorClick
}) => {
  const isFloating = mode === 'floating';
  const showBackdrop = isFloating && isVisible && activeTab;

  // Handle animation state with custom hook
  const { animationClass, shouldRender } = useSidebarAnimation({
    isVisible,
    isFloating,
  });

  const handleNewClick = () => {
    // TODO: Implement create new item
  };

  const handleSettingsClick = () => {
    // TODO: Implement settings
  };

  return (
    <>
      {/* Edge indicator (floating mode only) */}
      {isFloating && !shouldRender && (
        <EdgeIndicator onIndicatorClick={onIndicatorClick} />
      )}

      {/* Backdrop (floating mode only) */}
      {showBackdrop && <SidebarBackdrop onClick={(e) => onMouseLeave?.(e)} />}

      {/* Complete Sidebar Container (Ribbon + Panel) */}
      {(isFloating ? shouldRender : true) && (
        <div
          data-sidebar="true"
          className={`${isFloating ? 'fixed' : 'relative'} ${isFloating ? animationClass : ''}`}
          style={{
            ...(isFloating ? {
              left: '6px',
              top: 'calc(var(--titlebar-height) + var(--tabbar-height) + 6px)',
              height: 'calc(100vh - var(--titlebar-height) - var(--tabbar-height) - 12px)',
              zIndex: 100,
            } : {
              height: '100%',
            }),
          }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div
            className="flex"
            style={{
              height: '100%',
              backgroundColor: 'var(--bg-secondary)',
              border: isFloating ? '1px solid var(--border)' : 'none',
              borderRadius: isFloating ? '8px' : '0',
              boxShadow: isFloating ? '0 4px 20px rgba(0, 0, 0, 0.25)' : 'none',
              overflow: 'hidden',
              // Smooth transition when toggling pin/unpin
              transition: animationClass ? 'none' : 'border 0.5s ease, border-radius 0.5s ease, box-shadow 0.5s ease',
              // GPU acceleration to prevent flicker
              transform: 'translateZ(0)',
              willChange: isFloating && isVisible ? 'transform, opacity' : 'auto',
            }}
          >
            <SidebarRibbon
              activeTab={activeTab}
              onTabClick={onTabClick}
              onTabHover={onTabHover}
              onSettingsClick={handleSettingsClick}
            />

            {activeTab && (
              <SidebarPanel
                activeTab={activeTab}
                mode={mode}
                onTogglePin={onTogglePin}
                onNewClick={handleNewClick}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
