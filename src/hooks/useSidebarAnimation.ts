import { useState, useEffect } from 'react';

interface UseSidebarAnimationProps {
  isVisible: boolean;
  isFloating: boolean;
}

interface UseSidebarAnimationReturn {
  animationClass: string;
  shouldRender: boolean;
}

/**
 * Custom hook to manage sidebar animation state
 * Handles enter/exit animations and delayed unmounting
 */
export const useSidebarAnimation = ({
  isVisible,
  isFloating,
}: UseSidebarAnimationProps): UseSidebarAnimationReturn => {
  const [animationClass, setAnimationClass] = useState('');
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (isFloating) {
      if (isVisible) {
        setShouldRender(true);
        // Small delay to ensure DOM is ready before starting animation
        requestAnimationFrame(() => {
          setAnimationClass('sidebar-enter');
        });
      } else {
        setAnimationClass('sidebar-exit');
        // Delay unmount until exit animation completes
        const timer = setTimeout(() => {
          setShouldRender(false);
        }, 400); // Match sidebar-exit animation duration
        return () => clearTimeout(timer);
      }
    } else {
      // Pinned mode - always render, no animation
      setShouldRender(true);
      setAnimationClass('');
    }
  }, [isVisible, isFloating]);

  return { animationClass, shouldRender };
};
