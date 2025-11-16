import React from 'react';
import type { Tab } from '@/components/layout/TabBar';

export const WELCOME_TAB: Tab = {
  id: '1',
  title: 'Welcome',
  type: 'welcome',
  content: (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-accent">
          Welcome to Neutrino
        </h1>
        <p className="mb-6 text-secondary">
          Context-Aware Research Intelligence Platform for Academic Workflows
        </p>
        <button className="btn">Get Started</button>
      </div>
    </div>
  ),
};

export const createNewChatTab = (): Tab => ({
  id: Date.now().toString(),
  title: 'New Chat',
  type: 'chat',
  content: (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">New Chat Session</h2>
      <p className="text-secondary">Start typing to begin...</p>
    </div>
  ),
});

export const createDocumentTab = (documentId: string, title: string): Tab => ({
  id: `doc-${documentId}`,
  title: title.length > 30 ? `${title.substring(0, 30)}...` : title,
  type: 'document',
  documentId,
});
