import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AVAILABLE_COMMANDS } from '@/constants/commands';
import { ROUTES } from '@/constants/routes';
import type { CommandItem, CommandPaletteActions } from './types';
import { log } from '../../../lib/logger';

export const useStaticCommands = (
  actions: CommandPaletteActions,
  onClose: () => void,
  setQuery: (query: string) => void,
  inputRef: React.RefObject<HTMLInputElement | null>
) => {
  const navigate = useNavigate();

  return useMemo(() => {
    return AVAILABLE_COMMANDS.map(cmd => {
      let action: () => void;

      switch (cmd.id) {
        case 'nav-home':
          action = () => {
            navigate(ROUTES.HOME);
            onClose();
          };
          break;
        case 'nav-sessions':
          action = () => {
            navigate(ROUTES.SESSIONS);
            onClose();
          };
          break;
        case 'nav-documents':
          action = () => {
            setQuery('@doc ');
            inputRef.current?.focus();
          };
          break;
        case 'nav-notes':
          action = () => {
            setQuery('@note ');
            inputRef.current?.focus();
          };
          break;
        case 'create-session':
          action = () => {
            actions.onCreateSession();
            onClose();
          };
          break;
        case 'create-note':
          action = () => {
            actions.onCreateNote();
            onClose();
          };
          break;
        case 'import-pdf':
          action = () => {
            log.debug('Import PDF');
            onClose();
          };
          break;
        case 'open-settings':
          action = () => {
            actions.onOpenSettings();
            onClose();
          };
          break;
        default:
          action = () => {
            log.debug('Command not implemented:', cmd.id);
            onClose();
          };
      }

      return {
        id: cmd.id,
        title: cmd.title,
        subtitle: cmd.subtitle,
        icon: cmd.icon,
        category: cmd.category as 'action' | 'document' | 'note' | 'navigate',
        action,
      };
    });
  }, [navigate, actions, onClose, setQuery, inputRef]);
};
