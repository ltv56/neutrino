import { FileText, BookOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type SidebarTab = 'documents' | 'papers';

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
    id: 'papers',
    icon: BookOpen,
    title: 'Papers',
  },
];

export const SIDEBAR_HEADERS: Record<SidebarTab, string> = {
  documents: 'Documents',
  papers: 'Papers',
};

export const SIDEBAR_EMPTY_STATES: Record<SidebarTab, SidebarEmptyState> = {
  documents: {
    title: 'No documents yet',
    subtitle: 'Add PDFs to your session',
  },
  papers: {
    title: 'No papers yet',
    subtitle: 'Create your first paper note',
  },
};