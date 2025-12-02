import React from 'react';
import { File, StickyNote, FolderOpen } from 'lucide-react';
import { CommandItem } from './CommandItem';
import type { CommandItem as CommandItemType } from './types';
import type { DocumentSearchResult } from '@/services/documents';
import type { NoteSearchResult } from '@/services/notes';
import type { ResearchSession } from '@/types';

interface ResultsSectionProps {
  query: string;
  suggestions: Array<{ label: string; value: string; description: string }>;
  documents: {
    currentSession: DocumentSearchResult[];
    otherSessions: DocumentSearchResult[];
    vault: DocumentSearchResult[];
  };
  notes: NoteSearchResult[];
  sessions: ResearchSession[];
  staticCommands: CommandItemType[];
  selectedIndex: number;
  filteredCommands: CommandItemType[];
  onDocumentClick: (id: string, title: string) => void;
  onNoteClick: (id: string, title: string) => void;
  isSearching: boolean;
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  query,
  suggestions,
  documents,
  notes,
  sessions,
  staticCommands,
  selectedIndex,
  filteredCommands,
  onDocumentClick,
  onNoteClick,
  isSearching,
}) => {
  if (filteredCommands.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--fg-secondary)' }}>
        {isSearching ? 'Searching...' : query.trim().length === 0 ? 'Type to search...' : 'No results found'}
      </div>
    );
  }

  return (
    <div className="py-2">
      {suggestions.length > 0 && (
        <>
          <div className="mb-1">
            <div className="px-4 py-1 text-xs font-semibold" style={{ color: 'var(--fg-secondary)' }}>
              Suggestions
            </div>
          </div>
          {filteredCommands.filter(cmd => cmd.id.startsWith('suggestion-')).map((cmd) => {
            const globalIndex = filteredCommands.findIndex(c => c.id === cmd.id);
            return (
              <div key={cmd.id} data-command-index={globalIndex}>
                <CommandItem
                  icon={cmd.icon}
                  title={cmd.title}
                  subtitle={cmd.subtitle}
                  isSelected={globalIndex === selectedIndex}
                  onClick={cmd.action}
                />
              </div>
            );
          })}
        </>
      )}

      {query.trim().length >= 1 && documents.currentSession.length > 0 && (
        <>
          <div className="mb-1">
            <div className="px-4 py-1 text-xs font-semibold" style={{ color: 'var(--fg-secondary)' }}>
              Current Session ({documents.currentSession.length})
            </div>
          </div>
          {documents.currentSession.map((doc) => {
            const globalIndex = filteredCommands.findIndex(c => c.id === `doc-${doc.id}`);
            return (
              <div key={`doc-${doc.id}`} data-command-index={globalIndex}>
                <CommandItem
                  icon={<File size={18} />}
                  title={doc.title}
                  subtitle={doc.content_type.toUpperCase()}
                  isSelected={globalIndex === selectedIndex}
                  onClick={() => onDocumentClick(doc.id, doc.title)}
                />
              </div>
            );
          })}
        </>
      )}

      {query.trim().length >= 1 && (documents.vault.length > 0 || documents.otherSessions.length > 0) && (
        <>
          <div className="mb-1 mt-2">
            <div className="px-4 py-1 text-xs font-semibold" style={{ color: 'var(--fg-secondary)' }}>
              Other Documents ({documents.vault.length + documents.otherSessions.length})
            </div>
          </div>
          {documents.vault.map((doc) => {
            const globalIndex = filteredCommands.findIndex(c => c.id === `doc-${doc.id}`);
            return (
              <div key={`doc-${doc.id}`} data-command-index={globalIndex}>
                <CommandItem
                  icon={<File size={18} />}
                  title={doc.title}
                  subtitle={`${doc.content_type.toUpperCase()} • Vault`}
                  isSelected={globalIndex === selectedIndex}
                  onClick={() => onDocumentClick(doc.id, doc.title)}
                />
              </div>
            );
          })}
          {documents.otherSessions.map((doc) => {
            const globalIndex = filteredCommands.findIndex(c => c.id === `doc-${doc.id}`);
            const sessionName = doc.session_name || 'Unknown Session';
            return (
              <div key={`doc-${doc.id}`} data-command-index={globalIndex}>
                <CommandItem
                  icon={<File size={18} />}
                  title={doc.title}
                  subtitle={`${doc.content_type.toUpperCase()} • ${sessionName}`}
                  isSelected={globalIndex === selectedIndex}
                  onClick={() => onDocumentClick(doc.id, doc.title)}
                />
              </div>
            );
          })}
        </>
      )}

      {query.trim().length >= 1 && notes.length > 0 && (
        <>
          <div className="mb-1 mt-2">
            <div className="px-4 py-1 text-xs font-semibold" style={{ color: 'var(--fg-secondary)' }}>
              Notes ({notes.length})
            </div>
          </div>
          {notes.map((note) => {
            const globalIndex = filteredCommands.findIndex(c => c.id === `note-${note.id}`);
            const subtitle = note.content_preview || '';
            return (
              <div key={`note-${note.id}`} data-command-index={globalIndex}>
                <CommandItem
                  icon={<StickyNote size={18} />}
                  title={note.title}
                  subtitle={subtitle}
                  isSelected={globalIndex === selectedIndex}
                  onClick={() => onNoteClick(note.id, note.title)}
                />
              </div>
            );
          })}
        </>
      )}

      {query.trim().length >= 1 && sessions.length > 0 && (
        <>
          <div className="mb-1 mt-2">
            <div className="px-4 py-1 text-xs font-semibold" style={{ color: 'var(--fg-secondary)' }}>
              Sessions ({sessions.length})
            </div>
          </div>
          {sessions.map((session) => {
            const globalIndex = filteredCommands.findIndex(c => c.id === `session-${session.id}`);
            const cmd = filteredCommands.find(c => c.id === `session-${session.id}`);
            return (
              <div key={`session-${session.id}`} data-command-index={globalIndex}>
                <CommandItem
                  icon={cmd?.icon || <FolderOpen size={18} />}
                  title={cmd?.title || session.title}
                  subtitle={cmd?.subtitle}
                  isSelected={globalIndex === selectedIndex}
                  onClick={() => cmd?.action()}
                />
              </div>
            );
          })}
        </>
      )}

      {staticCommands.length > 0 && (
        <>
          {query.trim().length >= 1 && (
            <div className="mb-1 mt-2">
              <div className="px-4 py-1 text-xs font-semibold" style={{ color: 'var(--fg-secondary)' }}>
                Commands ({staticCommands.length})
              </div>
            </div>
          )}
          {staticCommands.map((cmd) => {
            const globalIndex = filteredCommands.findIndex(c => c.id === cmd.id);
            return (
              <div key={cmd.id} data-command-index={globalIndex}>
                <CommandItem
                  icon={cmd.icon}
                  title={cmd.title}
                  subtitle={cmd.subtitle}
                  isSelected={globalIndex === selectedIndex}
                  onClick={cmd.action}
                />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
