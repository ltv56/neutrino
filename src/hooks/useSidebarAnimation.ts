import { useState, useEffect, useRef } from 'react';
import { SIDEBAR_ANIMATION } from './useEdgeDetection';

interface UseSidebarAnimationProps {
  isVisible: boolean;
  isFloating: boolean;
}

interface UseSidebarAnimationReturn {
  animationClass: string;
  shouldRender: boolean;
}

// Derived at render time: waiting for an effect left one frame of a fully visible floating sidebar.
export const resolveAnimationClass = (
  isFloating: boolean,
  isVisible: boolean,
  stateClass: string
): string => {
  if (!isFloating) return '';
  return isVisible ? stateClass : 'sidebar-exit';
};

/**
 * Custom hook to manage sidebar animation state
 * Handles enter/exit animations and delayed unmounting
 * Only animates when visibility changes, not when mode toggles
 */
export const useSidebarAnimation = ({
  isVisible,
  isFloating,
}: UseSidebarAnimationProps): UseSidebarAnimationReturn => {
  const [animationClass, setAnimationClass] = useState('');
  const [shouldRender, setShouldRender] = useState(isVisible);
  const prevVisibleRef = useRef(isVisible);
  const prevFloatingRef = useRef(isFloating);

  useEffect(() => {
    const visibilityChanged = prevVisibleRef.current !== isVisible;
    const modeChanged = prevFloatingRef.current !== isFloating;

    prevVisibleRef.current = isVisible;
    prevFloatingRef.current = isFloating;

    if (isFloating) {
      if (isVisible) {
        setShouldRender(true);
        if (visibilityChanged) {
          requestAnimationFrame(() => {
            setAnimationClass('sidebar-enter');
          });
        } else if (modeChanged) {
          setAnimationClass('');
        }
      } else {
        setAnimationClass('sidebar-exit');
        const timer = setTimeout(() => {
          setShouldRender(false);
        }, SIDEBAR_ANIMATION.TOTAL_EXIT_TIME); // 450ms (400ms animation + 50ms buffer)
        return () => clearTimeout(timer);
      }
    } else {
      // Pinned mode - always render, no animation
      setShouldRender(true);
      setAnimationClass('');
    }
  }, [isVisible, isFloating]);

  return { animationClass: resolveAnimationClass(isFloating, isVisible, animationClass), shouldRender };
};
