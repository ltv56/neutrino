import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import type { Tab } from './TabBar';
import SessionsPage from '@/pages/SessionsPage';
import PDFViewer from '@/components/pdf/PDFViewer';
import { ROUTES } from '@/constants/routes';

interface MainContentProps {
  activeTab?: Tab;
}

const MainContent: React.FC<MainContentProps> = ({ activeTab }) => {
  const location = useLocation();

  const renderTabContent = () => {
    if (!activeTab) return null;

    // For document tabs, render PDFViewer directly
    if (activeTab.type === 'document' && activeTab.documentId) {
      return <PDFViewer documentId={activeTab.documentId} />;
    }

    // For other tabs, use pre-defined content
    return activeTab.content;
  };

  // For sessions route, use Routes
  if (location.pathname === ROUTES.SESSIONS) {
    return (
      <div
        className="flex-1 overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-primary)',
        }}
      >
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

  // For home route, render tabs directly (no routing needed)
  return (
    <div
      className="flex-1 overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <div className="h-full">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default MainContent;
