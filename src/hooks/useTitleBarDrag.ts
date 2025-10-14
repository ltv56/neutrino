import { useEffect, useRef } from 'react';

/**
 * Custom hook to handle titlebar drag functionality for Tauri window
 * Manages double-click to maximize/restore and drag to move window
 */
export const useTitleBarDrag = () => {
  const dragHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);

  useEffect(() => {
    // Check if running in Tauri
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
      return;
    }

    (async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      const titlebar = document.getElementById('titlebar');

      // Remove old listener if exists (StrictMode protection)
      if (titlebar && dragHandlerRef.current) {
        titlebar.removeEventListener('mousedown', dragHandlerRef.current);
      }

      const handleMouseDown = async (e: MouseEvent) => {
        const target = e.target as HTMLElement;

        // Skip if clicking on interactive elements (using [data-no-drag] attribute)
        if (target.closest('[data-no-drag]')) {
          return;
        }

        if (e.buttons === 1) {
          // Primary (left) button
          if (e.detail === 2) {
            // Double click - maximize/restore
            e.preventDefault();
            appWindow.toggleMaximize();
          } else {
            // Single click - only start dragging if NOT maximized
            const isMaximized = await appWindow.isMaximized();
            if (!isMaximized) {
              appWindow.startDragging();
            }
          }
        }
      };

      // Store handler in ref
      dragHandlerRef.current = handleMouseDown;

      if (titlebar) {
        titlebar.addEventListener('mousedown', handleMouseDown);
      }

      return () => {
        if (titlebar && dragHandlerRef.current) {
          titlebar.removeEventListener('mousedown', dragHandlerRef.current);
        }
      };
    })();
  }, []);
};
