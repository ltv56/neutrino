import { useState, useCallback, useRef } from 'react';

const STORAGE_KEY = 'neutrino-editor-toolbar-visible';

export function useToolbarPreference() {
  // Initialize from localStorage
  const [showToolbar, setShowToolbar] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved !== null ? saved === 'true' : true; // Default: true
  });

  const [toolbarClosing, setToolbarClosing] = useState(false);
  const hasUserToggledRef = useRef(false); // Track if user has manually toggled

  const toggleToolbar = useCallback(() => {
    hasUserToggledRef.current = true; // Enable animation for manual toggle

    setShowToolbar((prev) => {
      const newValue = !prev;

      // Persist to localStorage
      localStorage.setItem(STORAGE_KEY, String(newValue));

      // Handle closing animation
      if (!newValue) {
        setToolbarClosing(true);
        setTimeout(() => {
          setToolbarClosing(false);
        }, 400); // Match animation duration
      }

      return newValue;
    });
  }, []);

  return {
    showToolbar,
    toolbarClosing,
    toggleToolbar,
    hasUserToggled: hasUserToggledRef.current,
  };
}
