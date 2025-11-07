import React from 'react';

interface DividerProps {
  height?: string;
  width?: string;
  color?: string;
  margin?: string;
}

const Divider: React.FC<DividerProps> = ({
  height,
  width = '1px',
  color = 'var(--border)',
  margin,
}) => {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: color,
        margin,
      }}
    />
  );
};

export default Divider;
