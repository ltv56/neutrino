import { FileText, MessageSquare, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type SidebarTab = 'sessions' | 'documents';

export interface SidebarTabConfig {
  id: SidebarTab;
  icon: LucideIcon;
  title: string;
}

export interface SidebarEmptyState {
  title: string;
  subtitle: string;
}

export const SIDEBAR_TABS: SidebarTabConfig[] = [
  {
    id: 'sessions',
    icon: MessageSquare,
    title: 'Sessions',
  },
  {
    id: 'documents',
    icon: FileText,
    title: 'Documents',
  },
];

export const SIDEBAR_HEADERS: Record<SidebarTab, string> = {
  sessions: 'Chat Sessions',
  documents: 'Documents',
};

export const SIDEBAR_EMPTY_STATES: Record<SidebarTab, SidebarEmptyState> = {
  sessions: {
    title: 'New Conversation',
    subtitle: 'Start a new chat session',
  },
  documents: {
    title: 'No documents yet',
    subtitle: 'Create your first document',
  },
};