import { FileText, BookOpen, Link2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type SidebarTab = 'documents' | 'papers' | 'links';

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
  {
    id: 'links',
    icon: Link2,
    title: 'Links',
  },
];

export const SIDEBAR_HEADERS: Record<SidebarTab, string> = {
  documents: 'Documents',
  papers: 'Papers',
  links: 'Links',
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
  links: {
    title: 'No links yet',
    subtitle: 'Create wiki links in your notes',
  },
};