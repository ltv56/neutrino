import React, { useRef, useState, useEffect } from 'react';
import { X, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import Tooltip from '@/components/common/Tooltip';

import './TabBar.css';

export interface Tab {
  id: string;
  title: string;
  content?: React.ReactNode;
  type?: 'document' | 'chat' | 'welcome';
  documentId?: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd: () => void;
}

const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onTabAdd,
}) => {
  const scrollContainerRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    onTabClose(tabId);
  };

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    const timer = setTimeout(checkScroll, 0);
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        clearTimeout(timer);
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [tabs]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 150;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <nav
      className="flex items-center bg-secondary relative"
      style={{ height: 'var(--tabbar-height)' }}
      aria-label="Tab navigation"
    >
      {/* Border bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-[var(--border-light)]" style={{ zIndex: 0 }} />

      {/* Left scroll button */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="flex-shrink-0 p-1 mb-1 rounded text-secondary hover:bg-tertiary transition-smooth-fast"
          style={{ position: 'relative', zIndex: 1 }}
          title="Scroll Left"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* Tabs container as ul for semantic HTML */}
      <ul
        ref={scrollContainerRef}
        className="flex items-end overflow-x-auto h-full flex-1 relative"
        style={{
          gap: '2px',
          zIndex: 1,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingLeft: canScrollLeft ? '0' : '10px', // Must be >= curve-size for proper clipping
          paddingRight: canScrollRight ? '0' : '10px', // Must be >= curve-size for proper clipping
        }}
        role="tablist"
      >
        <style>{`
          .flex.items-end.overflow-x-auto::-webkit-scrollbar { 
            display: none; 
          }
        `}</style>

        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <li
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
        tab flex items-center gap-2 px-3 cursor-pointer transition-smooth-fast
        ${isActive
                  ? 'tab-active bg-primary text-primary'
                  : 'bg-transparent text-secondary hover:bg-tertiary hover:text-primary'
                }
      `}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
            >
              {/* Thêm curve elements cho active tab */}
              {isActive && (
                <>
                  <span className="tab-curve-left" />
                  <span className="tab-curve-right" />
                </>
              )}

              <span className="text-xs font-medium whitespace-nowrap truncate flex-1">
                {tab.title}
              </span>

              {tabs.length > 1 && (
                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="close-btn flex-shrink-0 p-0.5 rounded text-secondary hover:bg-active"
                  aria-label={`Close ${tab.title} tab`}
                >
                  <X size={14} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Right scroll button */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="flex-shrink-0 p-1 mb-1 rounded text-secondary hover:bg-tertiary transition-smooth-fast"
          style={{ position: 'relative', zIndex: 1 }}
          title="Scroll Right"
          aria-label="Scroll tabs right"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Add tab button */}
      <Tooltip content="Menu" placement='bottom-right'>
        <button
          onClick={onTabAdd}
          className="p-1 mr-1.5 rounded hover:bg-[var(--bg-active)] transition-colors"
          aria-label="Add new tab"
        >
          <Plus size={20} style={{ color: 'var(--fg-secondary)' }} />
        </button>
      </Tooltip>
    </nav>
  );
};

export default TabBar;