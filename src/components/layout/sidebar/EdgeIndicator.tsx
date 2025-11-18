import React from 'react';
import { ArrowRightFromLine } from 'lucide-react';

interface EdgeIndicatorProps {
  onIndicatorClick?: () => void;
}

const EdgeIndicator: React.FC<EdgeIndicatorProps> = ({ onIndicatorClick }) => {
  return (
    <div
      data-edge-indicator="true"
      className="fixed left-0 flex items-center justify-center cursor-pointer pointer-events-auto z-[101] group"
      style={{
        top: 'calc(var(--titlebar-height) + var(--tabbar-height))',
        width: '12px',
        height: 'calc(100vh - var(--titlebar-height) - var(--tabbar-height))',
      }}
      onClick={onIndicatorClick}
    >
      <div
        className="w-1 h-20 flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          backgroundColor: 'var(--accent)',
          borderTopRightRadius: '4px',
          borderBottomRightRadius: '4px',
        }}
      >
        <ArrowRightFromLine
          size={16}
          className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        />
      </div>
    </div>
  );
};

export default EdgeIndicator;
