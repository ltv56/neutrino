import React from 'react';
import type { Tab } from '@/components/layout/TabBar';
import EmptyTab from '@/components/welcome/EmptyTab';

export const WELCOME_TAB: Tab = {
  id: '1',
  title: 'Welcome',
  type: 'welcome',
  content: (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md space-y-4">
        <h1 className="text-3xl font-bold mb-4 text-accent">
          Welcome to Neutrino
        </h1>
        <p className="mb-6 text-secondary">
          Context-Aware Research Intelligence Platform for Academic Workflows
        </p>
        <div className="flex gap-2 justify-center">
          <button
            className="btn"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('workspace:create-empty-tab'));
            }}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  ),
};

export const createEmptyTab = (): Tab => ({
  id: `empty-${Date.now()}`,
  title: 'New Tab',
  type: 'welcome',
  content: <EmptyTab />,
});

export const createDocumentTab = (documentId: string, title: string, page?: number): Tab => ({
  id: `doc-${documentId}`,
  title: title.length > 30 ? `${title.substring(0, 30)}...` : title,
  type: 'document',
  documentId,
  page: page || 1, // Default to page 1
});

export const createNoteTab = (noteId: string | null, title?: string): Tab => {
  const displayTitle = title || 'Untitled';
  return {
    id: noteId ? `note-${noteId}` : `note-new-${Date.now()}`,
    title: displayTitle.length > 30 ? `${displayTitle.substring(0, 30)}...` : displayTitle,
    type: 'note',
    noteId: noteId || undefined,
  };
};
