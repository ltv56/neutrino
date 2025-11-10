import React from 'react';
import { ArrowRightFromLine } from 'lucide-react';
import styles from './EdgeIndicator.module.css';

interface EdgeIndicatorProps {
  onIndicatorClick?: () => void;
}

const EdgeIndicator: React.FC<EdgeIndicatorProps> = ({ onIndicatorClick }) => {
  return (
    <div
      data-edge-indicator="true"
      className={styles.container}
      onClick={onIndicatorClick}
    >
      <div className={styles.indicator}>
        <ArrowRightFromLine size={16} className={styles.arrow} />
      </div>
    </div>
  );
};

export default EdgeIndicator;
