export interface CommandPaletteActions {
  onCreateSession: () => void;
  onCreateNote: () => void;
  onOpenSettings: () => void;
  onOpenDocument: (documentId: string, title: string) => void;
  onOpenNote: (noteId: string, title: string) => void;
  onNavigateToSessions: () => void;
  onNavigate?: (path: string) => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrefix?: string;
  actions: CommandPaletteActions;
  currentSessionId?: string | null;
}

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  category: 'action' | 'document' | 'note' | 'navigate' | 'session';
  action: () => void;
}

export interface FilterChip {
  key: string;
  label: string;
  value?: string;
  negate?: boolean;
}

export interface Suggestion {
  label: string;
  value: string;
  description: string;
}
