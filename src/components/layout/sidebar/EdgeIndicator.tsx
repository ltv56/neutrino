import React, { useRef, useEffect } from 'react';
import { ArrowRightFromLine } from 'lucide-react';
import styles from './EdgeIndicator.module.css';
import { EDGE_CONFIG } from '@/hooks/useEdgeDetection';

interface EdgeIndicatorProps {
  onIndicatorClick?: () => void;
}

const EdgeIndicator: React.FC<EdgeIndicatorProps> = ({ onIndicatorClick }) => {
  const hoverTimerRef = useRef<number | null>(null);
  const morphCompleteRef = useRef(false);
  const isHoveringRef = useRef(false);

  const handleClick = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    morphCompleteRef.current = false;
    onIndicatorClick?.();
  };

  const startDelayTimer = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

    hoverTimerRef.current = window.setTimeout(() => {
      onIndicatorClick?.();
      hoverTimerRef.current = null;
      morphCompleteRef.current = false;
    }, EDGE_CONFIG.TIMINGS.SHOW_DELAY);
  };

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName === 'width' && !morphCompleteRef.current && isHoveringRef.current) {
      morphCompleteRef.current = true;
      startDelayTimer();
    }
  };

  const handleMouseEnter = () => {
    isHoveringRef.current = true;
    morphCompleteRef.current = false;
  };

  const handleMouseLeave = () => {
    isHoveringRef.current = false;
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    morphCompleteRef.current = false;
  };

  useEffect(() => {
    const handleWindowBlur = () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      morphCompleteRef.current = false;
    };

    const handleDocumentMouseLeave = () => {
      isHoveringRef.current = false;
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      morphCompleteRef.current = false;
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('mouseleave', handleDocumentMouseLeave);

    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('mouseleave', handleDocumentMouseLeave);
    };
  }, []);

  return (
    <div
      data-edge-indicator="true"
      className={styles.container}
    >
      <div
        className={styles.hoverZone}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      <div
        className={styles.indicator}
        onTransitionEnd={handleTransitionEnd}
      >
        <ArrowRightFromLine size={16} className={styles.arrow} />
      </div>
    </div>
  );
};

export default EdgeIndicator;
