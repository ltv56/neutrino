import React from 'react';
import type { Tab } from './TabBar';

interface MainContentProps {
  activeTab?: Tab;
}

const MainContent: React.FC<MainContentProps> = ({ activeTab }) => {
  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {activeTab?.content}
    </div>
  );
};

export default MainContent;
