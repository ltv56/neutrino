import React from 'react';

interface SidebarBackdropProps {
  onClick?: (e: React.MouseEvent) => void;
}

const SidebarBackdrop: React.FC<SidebarBackdropProps> = ({ onClick }) => {
  return (
    <div
      className="fixed inset-0 transition-smooth-fast"
      style={{
        top: 'calc(var(--titlebar-height) + var(--tabbar-height))',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(2px)',
        zIndex: 99,
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={onClick}
    />
  );
};

export default SidebarBackdrop;
