import React from 'react';
import { Routes, Route } from 'react-router-dom';
import type { Tab } from './TabBar';
import SessionsPage from '@/pages/SessionsPage';
import { ROUTES } from '@/constants/routes';

interface MainContentProps {
  activeTab?: Tab;
}

const MainContent: React.FC<MainContentProps> = ({ activeTab }) => {
  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <Routes>
        <Route path={ROUTES.HOME} element={activeTab?.content} />
        <Route path={ROUTES.SESSIONS} element={<SessionsPage />} />
      </Routes>
    </div>
  );
};

export default MainContent;
