import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Tooltip from '@/components/common/Tooltip';

const NavigationButtons: React.FC = () => {
  return (
    <div className="flex items-center gap-1" data-no-drag>
      <Tooltip content="Back" placement='bottom-right'>
        <button className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors">
          <ChevronLeft size={16} style={{ color: 'var(--fg-secondary)' }} />
        </button>
      </Tooltip>
      <Tooltip content="Forward" placement='bottom-left'>
        <button className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors">
          <ChevronRight size={16} style={{ color: 'var(--fg-secondary)' }} />
        </button>
      </Tooltip>
    </div>
  );
};

export default NavigationButtons;
