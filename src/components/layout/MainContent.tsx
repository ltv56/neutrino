import React, { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import type { Tab } from './TabBar';
import SessionsPage from '@/pages/SessionsPage';
import { ROUTES } from '@/constants/routes';

// Lazy load PDF viewer - only loads when needed
const PDFViewer = lazy(() => import('@/components/pdf/PDFViewer'));

interface MainContentProps {
  activeTab?: Tab;
}

const MainContent: React.FC<MainContentProps> = ({ activeTab }) => {
  const location = useLocation();

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
          <PDFViewer documentId={activeTab.documentId} />
        </Suspense>
      );
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
