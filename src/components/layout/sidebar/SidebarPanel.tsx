import React from 'react';
import { SIDEBAR_HEADERS, SIDEBAR_EMPTY_STATES, type SidebarTab } from '@/constants/sidebar';
import { NotesList } from '@/components/notes/NotesList';
import { useSessionsContext } from '@/hooks';

interface SidebarPanelProps {
  activeTab: SidebarTab;
  mode: 'floating' | 'pinned';
  onNewClick: () => void;
  onNoteSelect?: (noteId: string, title: string) => void;
}

const SidebarPanel: React.FC<SidebarPanelProps> = ({
  activeTab,
  mode,
  onNewClick,
  onNoteSelect,
}) => {
  const { currentSession } = useSessionsContext();

  const renderContent = () => {
    switch (activeTab) {
      case 'papers':
        return (
          <NotesList
            sessionId={currentSession?.id}
            onNoteSelect={onNoteSelect}
            onCreateNote={onNewClick}
          />
        );
      case 'documents':
      default:
        return (
          <div className="px-2 py-2">
            <div className="space-y-1">
              <div className="p-2 rounded text-sm cursor-pointer transition-colors text-secondary">
                <div className="font-medium text-primary">
                  {SIDEBAR_EMPTY_STATES[activeTab].title}
                </div>
                <div className="text-xs mt-1">
                  {SIDEBAR_EMPTY_STATES[activeTab].subtitle}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className="flex flex-col flex-1"
      style={{
        minWidth: 0,
      }}
    >
      {/* Content List */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default SidebarPanel;
