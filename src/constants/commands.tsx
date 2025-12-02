import React from 'react';
import {
  FileText,
  Settings,
  Plus,
  FolderOpen,
  StickyNote,
  Upload,
  Home,
} from 'lucide-react';

export interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  category: 'navigate' | 'create' | 'view' | 'import' | 'settings';
  keywords?: string[]; // For better search matching
  action: () => void;
}

export const AVAILABLE_COMMANDS: Omit<Command, 'action'>[] = [
  // Navigation commands
  {
    id: 'nav-home',
    title: 'Go to Home',
    subtitle: 'Navigate to home page',
    icon: <Home size={18} />,
    category: 'navigate',
    keywords: ['home', 'main', 'dashboard'],
  },
  {
    id: 'nav-sessions',
    title: 'Manage Sessions',
    subtitle: 'View and manage all sessions',
    icon: <FolderOpen size={18} />,
    category: 'navigate',
    keywords: ['sessions', 'research', 'projects', 'manage', 'view'],
  },
  {
    id: 'nav-documents',
    title: 'Search Documents',
    subtitle: 'Filter by documents only',
    icon: <FileText size={18} />,
    category: 'navigate',
    keywords: ['documents', 'files', 'pdfs'],
  },
  {
    id: 'nav-notes',
    title: 'Search Notes',
    subtitle: 'Filter by notes only',
    icon: <StickyNote size={18} />,
    category: 'navigate',
    keywords: ['notes', 'annotations'],
  },

  // Create commands
  {
    id: 'create-session',
    title: 'Create New Session',
    subtitle: 'Start a new research session',
    icon: <Plus size={18} />,
    category: 'create',
    keywords: ['create', 'new', 'session', 'research'],
  },
  {
    id: 'create-note',
    title: 'Create New Note',
    subtitle: 'Create a new note in current session',
    icon: <Plus size={18} />,
    category: 'create',
    keywords: ['create', 'new', 'note'],
  },

  // Import commands
  {
    id: 'import-pdf',
    title: 'Import PDF',
    subtitle: 'Import a PDF document',
    icon: <Upload size={18} />,
    category: 'import',
    keywords: ['import', 'upload', 'pdf', 'document'],
  },

  // Settings
  {
    id: 'open-settings',
    title: 'Open Settings',
    subtitle: 'Configure application settings',
    icon: <Settings size={18} />,
    category: 'settings',
    keywords: ['settings', 'preferences', 'config'],
  },
];
