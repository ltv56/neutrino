import React, { useRef, useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Tooltip from '@/components/common/Tooltip';

import './TabBar.css';

export interface Tab {
  id: string;
  title: string;
  content?: React.ReactNode;
  type?: 'document' | 'chat' | 'welcome' | 'note';
  documentId?: string;
  noteId?: string;
  page?: number; // For document tabs - which page to open
  // Position restoration data
  scrollPosition?: number;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  showCloseOnSingleTab?: boolean; // Optional - show close button even with single tab (for split view)
  isRightmost?: boolean; // Reserve space for toolbar buttons if this is the rightmost panel
  isFocused?: boolean; // Visual indicator for focused panel
}

const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  showCloseOnSingleTab = false,
  isRightmost = true, // Default true for single panel
  isFocused = true, // Default true for single panel
}) => {
  const scrollContainerRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1 && !showCloseOnSingleTab) return;
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
      className={`flex items-center relative ${isFocused ? 'tabbar-focused' : ''}`}
      style={{
        height: 'var(--tabbar-height)',
        paddingLeft: '8px',
        paddingRight: isRightmost ? '70px' : '8px', // Reserve space only if rightmost panel
        position: 'relative'
      }}
      aria-label="Tab navigation"
    >
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
          zIndex: 10,
          // 2px taller than the bar: overflow-x clips y too, and the active tab overlaps the content border by 2px
          alignSelf: 'flex-start',
          height: 'calc(100% + 2px)',
          paddingBottom: '2px',
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
                  ? 'tab-active bg-secondary text-primary'
                  : 'bg-transparent text-secondary hover:bg-tertiary hover:text-primary'
                }
      `}
              style={{
                maxWidth: '200px',
                minWidth: 0,
                flexShrink: 0,
              }}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
            >
              {/* Curve elements for the active tab */}
              {isActive && (
                <>
                  <span className="tab-curve-left" />
                  <span className="tab-curve-right" />
                </>
              )}

              <Tooltip content={tab.type === 'note' ? `${tab.title}.md` : tab.title} placement="bottom">
                <div style={{ maxWidth: '150px', minWidth: 0, overflow: 'hidden' }}>
                  <span className="text-xs font-medium truncate block">
                    {tab.type === 'note' ? `${tab.title}.md` : tab.title}
                  </span>
                </div>
              </Tooltip>

              {(tabs.length > 1 || showCloseOnSingleTab) && (
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
    </nav>
  );
};

export default TabBar;