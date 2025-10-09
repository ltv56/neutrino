import React from 'react';
import { Clock, FileText, MessageSquare, Settings } from 'lucide-react';

export interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  category: 'recent' | 'search' | 'navigate' | 'action';
  action: () => void;
}

export const DEFAULT_COMMANDS: Omit<Command, 'action'>[] = [
  {
    id: '1',
    title: 'New Chat Session',
    subtitle: 'Start a new conversation',
    icon: <MessageSquare size={18} />,
    category: 'action',
  },
  {
    id: '2',
    title: 'New Document',
    subtitle: 'Create a new document',
    icon: <FileText size={18} />,
    category: 'action',
  },
  {
    id: '3',
    title: 'Settings',
    subtitle: 'Open settings',
    icon: <Settings size={18} />,
    category: 'navigate',
  },
  {
    id: '4',
    title: 'Recent Conversation',
    subtitle: '5 minutes ago',
    icon: <Clock size={18} />,
    category: 'recent',
  },
];
