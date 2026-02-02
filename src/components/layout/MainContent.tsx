import React, { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import type { Tab } from './TabBar';
import SessionsPage from '@/pages/SessionsPage';
import { ROUTES } from '@/constants/routes';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { useSessionsContext } from '@/hooks';
import './TabBar.css';

// Lazy load PDF viewer - only loads when needed
const PDFViewer = lazy(() => import('@/components/pdf/PDFViewer'));

interface MainContentProps {
  activeTab?: Tab;
  isFocused?: boolean;
}

const MainContent: React.FC<MainContentProps> = ({ activeTab, isFocused = true }) => {
  const location = useLocation();
  const { currentSession } = useSessionsContext();

  const renderTabContent = () => {
    if (!activeTab) return null;

    // For document tabs, render PDFViewer with lazy loading
    if (activeTab.type === 'document' && activeTab.documentId) {
      return (
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="text-secondary">Loading PDF viewer...</div>
          </div>
        }>
          <PDFViewer
            documentId={activeTab.documentId}
            tabId={activeTab.id}
            initialPage={activeTab.page || 1}
            initialScrollPosition={activeTab.scrollPosition}
          />
        </Suspense>
      );
    }

    // For note tabs, render NoteEditor
    if (activeTab.type === 'note') {
      return (
        <NoteEditor
          noteId={activeTab.noteId}
          sessionId={currentSession?.id}
          onClose={() => { }} // User can close via TabBar X button
          onSave={(noteId) => {
            // Note saved successfully
            console.log('Note saved:', noteId);
          }}
        />
      );
    }

    // For other tabs, use pre-defined content
    return activeTab.content;
  };

  // For sessions route, use Routes
  if (location.pathname === ROUTES.SESSIONS) {
    return (
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route
            path={ROUTES.SESSIONS}
            element={
              <div className="h-full" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
                <SessionsPage />
              </div>
            }
          />
        </Routes>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden main-content-with-corner-borders"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px',
        borderWidth: '0 1px 1px 1px',
        borderStyle: 'solid',
        borderColor: isFocused ? 'var(--accent)' : 'var(--border-light)',
      }}
    >
      <div className="flex-1 min-h-0">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default MainContent;
