import React from 'react';

interface EdgeIndicatorProps {
  onMouseEnter?: () => void;
}

const EdgeIndicator: React.FC<EdgeIndicatorProps> = ({ onMouseEnter }) => {
  return (
    <div
      className="fixed"
      style={{
        left: '0',
        top: 'calc(var(--titlebar-height) + var(--tabbar-height))',
        width: '8px',
        height: 'calc(100vh - var(--titlebar-height) - var(--tabbar-height))',
        zIndex: 101,
        cursor: 'pointer',
      }}
      onMouseEnter={onMouseEnter}
    >
      {/* Visual indicator inside hover container */}
      <div
        className="absolute transition-smooth-fast"
        style={{
          left: '0',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '4px',
          height: '80px',
          backgroundColor: 'var(--accent)',
          borderTopRightRadius: '4px',
          borderBottomRightRadius: '4px',
          opacity: 0.7,
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLDivElement).style.width = '6px';
          (e.currentTarget as HTMLDivElement).style.opacity = '1';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLDivElement).style.width = '4px';
          (e.currentTarget as HTMLDivElement).style.opacity = '0.7';
        }}
      />
    </div>
  );
};

export default EdgeIndicator;
