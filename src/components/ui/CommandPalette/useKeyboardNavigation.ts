import { useEffect } from 'react';
import type { CommandItem } from './types';

export const useKeyboardNavigation = (
  isOpen: boolean,
  selectedIndex: number,
  setSelectedIndex: (index: number | ((prev: number) => number)) => void,
  filteredCommands: CommandItem[],
  inputRef: React.RefObject<HTMLInputElement | null>
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      const isInputFocused = document.activeElement === inputRef.current;
      if (isInputFocused && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => prev < filteredCommands.length - 1 ? prev + 1 : prev);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, inputRef, setSelectedIndex]);

  useEffect(() => setSelectedIndex(0), [filteredCommands.length, setSelectedIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const selectedElement = document.querySelector(`[data-command-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex, isOpen]);
};
