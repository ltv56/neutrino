import { FileText, StickyNote } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type SidebarTab = 'documents' | 'notes';

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
    id: 'documents',
    icon: FileText,
    title: 'Documents',
  },
  {
    id: 'notes',
    icon: StickyNote,
    title: 'Notes',
  },
];

export const SIDEBAR_HEADERS: Record<SidebarTab, string> = {
  documents: 'Documents',
  notes: 'Notes',
};

export const SIDEBAR_EMPTY_STATES: Record<SidebarTab, SidebarEmptyState> = {
  documents: {
    title: 'No documents yet',
    subtitle: 'Add PDFs to your session',
  },
  notes: {
    title: 'No notes yet',
    subtitle: 'Create your first note',
  },
};