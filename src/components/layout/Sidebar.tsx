import React, { useState } from 'react';
import { type SidebarTab } from '@/constants/sidebar';
import EdgeIndicator from './sidebar/EdgeIndicator';
import SidebarBackdrop from './sidebar/SidebarBackdrop';
import SidebarRibbon from './sidebar/SidebarRibbon';
import SidebarPanel from './sidebar/SidebarPanel';
import VaultPanel from '@/components/vault/VaultPanel';
import { useSidebarAnimation } from '@/hooks';
import { useSessionsContext } from '@/hooks';
import SessionSelector from '@/components/sessions/SessionSelector';
import { SessionForm } from '@/components/sessions/SessionForm';
import type { ResearchSession } from '@/types';

interface SidebarProps {
  mode: 'floating' | 'pinned';
  isVisible: boolean;
  activeTab: SidebarTab; // Always has an active tab
  onTogglePin: () => void;
  onTabClick: (tab: SidebarTab) => void;
  onTabHover: (tab: SidebarTab) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onIndicatorClick?: () => void;
  isVaultOpen?: boolean;
  onToggleVault?: () => void;
  onOpenDocument?: (documentId: string, title: string) => void;
  onNoteSelect?: (noteId: string, title: string) => void;
  onCreateNote?: () => void;
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
  onIndicatorClick,
  isVaultOpen,
  onToggleVault,
  onOpenDocument,
  onNoteSelect,
  onCreateNote,
}) => {
  const isFloating = mode === 'floating';
  const showBackdrop = isFloating && isVisible;

  // Session management
  const { sessions, createSession, updateSession, currentSession, selectSession } = useSessionsContext();
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSession, setEditingSession] = useState<ResearchSession | null>(null);

  // Handle sidebar animation state
  const { animationClass, shouldRender } = useSidebarAnimation({
    isVisible,
    isFloating,
  });

  const handleNewClick = () => {
    if (activeTab === 'notes' && onCreateNote) {
      onCreateNote();
    }
    // TODO: Handle other tab types (documents, etc.)
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

      {/* Session Form Modal - Portal renders to document.body */}
      <SessionForm
        isOpen={showSessionForm}
        onClose={() => {
          setShowSessionForm(false);
          setEditingSession(null);
        }}
        onCreate={async (title, goal) => {
          const newSession = await createSession(title, goal);
          if (newSession) {
            selectSession(newSession);
          }
          return newSession;
        }}
        onUpdate={updateSession}
        editSession={editingSession}
      />

      {/* Complete Sidebar Container (Dual Panel: Vault + Session) */}
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
            className="flex bg-secondary"
            style={{
              height: '100%',
              width: isVaultOpen ? 'calc(240px + var(--sidebar-width))' : 'var(--sidebar-width)',
              border: isFloating ? '1px solid var(--border)' : 'none',
              borderRadius: isFloating ? '8px' : '0',
              boxShadow: isFloating ? '0 8px 32px rgba(0, 0, 0, 0.5)' : 'none',
              overflow: 'hidden',
              // Smooth transition when toggling vault or pin/unpin
              transition: animationClass ? 'none' : 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), border 0.5s ease, border-radius 0.5s ease, box-shadow 0.5s ease',
              // GPU acceleration to prevent flicker
              transform: 'translateZ(0)',
              willChange: isFloating && isVisible ? 'transform, opacity' : 'auto',
            }}
          >
            {/* Vault Panel */}
            {isVaultOpen && (
              <div style={{ width: '240px', flexShrink: 0 }}>
                <VaultPanel onOpenDocument={onOpenDocument} />
              </div>
            )}

            {/* Session Panel */}
            <div className="flex-col flex"
              style={{
                flex: 1,
                minWidth: 0,
                borderRight: '1px solid var(--border)'
              }}>
              {/* Session Selector */}
              <div className="shrink-0 px-2 py-1 border-b border-default" style={{ overflow: 'visible' }}>
                <SessionSelector
                  sessions={sessions}
                  currentSession={currentSession}
                  onSelectSession={selectSession}
                  onCreateNew={() => {
                    setEditingSession(null);
                    setShowSessionForm(true);
                  }}
                />
              </div>

              {/* Ribbon + Panel */}
              <div className='flex flex-1 min-h-0'>
                <SidebarRibbon
                  activeTab={activeTab}
                  onTabClick={onTabClick}
                  onTabHover={onTabHover}
                  onSettingsClick={handleSettingsClick}
                  isVaultOpen={isVaultOpen}
                  onVaultClick={onToggleVault}
                />

                <SidebarPanel
                  activeTab={activeTab}
                  mode={mode}
                  onNewClick={handleNewClick}
                  onNoteSelect={onNoteSelect}
                />
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
