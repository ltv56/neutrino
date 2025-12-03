import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Link as LinkIcon,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  FileCode,
  Quote,
  Minus,
  Image as ImageIcon,
  ChevronDown
} from 'lucide-react';
import Tooltip from '../common/Tooltip';

interface MarkdownToolbarProps {
  onInsert: (text: string, offset?: number) => void;
}

const HEADING_OPTIONS = [
  { label: 'Title', value: '# ', prefix: '# ', level: 1 },
  { label: 'Subtitle', value: '## ', prefix: '## ', level: 2 },
  { label: 'Heading', value: '### ', prefix: '### ', level: 3 },
  { label: 'Subheading', value: '#### ', prefix: '#### ', level: 4 },
  { label: 'Section', value: '##### ', prefix: '##### ', level: 5 },
  { label: 'Subsection', value: '###### ', prefix: '###### ', level: 6 },
  { label: 'Body', value: '', prefix: '', level: 0 },
];

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ onInsert }) => {
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);
  const headingButtonRef = useRef<HTMLButtonElement>(null);
  const listButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close heading menu
      if (
        menuRef.current &&
        headingButtonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !headingButtonRef.current.contains(event.target as Node)
      ) {
        setShowHeadingMenu(false);
      }

      // Close list menu
      if (
        listMenuRef.current &&
        listButtonRef.current &&
        !listMenuRef.current.contains(event.target as Node) &&
        !listButtonRef.current.contains(event.target as Node)
      ) {
        setShowListMenu(false);
      }
    };

    if (showHeadingMenu || showListMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHeadingMenu, showListMenu]);

  const handleHeading = (level: number, prefix: string) => {
    onInsert(prefix);
    setShowHeadingMenu(false);
  };

  const handleBold = () => {
    onInsert('****', -2);
  };

  const handleItalic = () => {
    onInsert('**', -1);
  };

  const handleStrikethrough = () => {
    onInsert('~~~~', -2);
  };

  const handleInlineCode = () => {
    onInsert('``', -1);
  };

  const handleLink = () => {
    onInsert('[]()', -3);
  };

  const handleImage = () => {
    onInsert('![]()', -3);
  };

  const handleBulletList = () => {
    onInsert('- ');
    setShowListMenu(false);
  };

  const handleNumberedList = () => {
    onInsert('1. ');
    setShowListMenu(false);
  };

  const handleTaskList = () => {
    onInsert('- [ ] ');
    setShowListMenu(false);
  };

  const handleBlockquote = () => {
    onInsert('> ');
  };

  const handleCodeBlock = () => {
    onInsert('```\n\n```', -4);
  };

  const handleHorizontalRule = () => {
    onInsert('\n---\n');
  };

  const Separator = () => (
    <div
      style={{
        width: '1px',
        height: '16px',
        backgroundColor: 'var(--border)',
      }}
    />
  );

  const ToolButton = ({ onClick, title, icon: Icon, children, style, placement }: {
    onClick: () => void;
    title: string;
    icon?: React.ComponentType<{ size?: number }>;
    children?: React.ReactNode;
    style?: React.CSSProperties;
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  }) => (
    <Tooltip content={title} delay={300} placement={placement || 'top'}>
      <button
        onClick={onClick}
        className="p-1.5 rounded hover:bg-(--bg-tertiary) transition-colors"
        style={{ color: 'var(--text-primary)', ...style }}
      >
        {children || (Icon && <Icon size={14} />)}
      </button>
    </Tooltip>
  );

  return (
    <div
      className="flex items-center gap-1 px-2 py-1.5"
      style={{
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      {/* Heading Dropdown */}
      <div className="relative">
        <Tooltip content="Heading" delay={300}>
          <button
            ref={headingButtonRef}
            onClick={() => setShowHeadingMenu(!showHeadingMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-(--bg-tertiary) transition-colors"
            style={{
              fontSize: '12px',
              color: 'var(--text-primary)',
            }}
          >
            <span>H1</span>
            <ChevronDown size={12} />
          </button>
        </Tooltip>

        {showHeadingMenu && (
          <div
            ref={menuRef}
            className="absolute top-full left-0 mt-1 rounded shadow-lg z-50"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              minWidth: '140px',
            }}
          >
            {HEADING_OPTIONS.map((option) => {
              const fontSize = option.level === 0 ? '13px' :
                option.level === 1 ? '18px' :
                option.level === 2 ? '16px' :
                option.level === 3 ? '15px' :
                option.level === 4 ? '14px' :
                option.level === 5 ? '13.5px' : '13px';
              const fontWeight = option.level === 0 ? 400 : 600;

              return (
                <button
                  key={option.label}
                  onClick={() => handleHeading(option.level, option.prefix)}
                  className="w-full text-left px-3 py-1.5 hover:bg-(--bg-tertiary) transition-colors"
                  style={{
                    fontSize,
                    fontWeight,
                    color: 'var(--text-primary)',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* Lists Dropdown */}
      <div className="relative">
        <Tooltip content="Lists" delay={300}>
          <button
            ref={listButtonRef}
            onClick={() => setShowListMenu(!showListMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-(--bg-tertiary) transition-colors"
            style={{
              fontSize: '12px',
              color: 'var(--text-primary)',
            }}
          >
            <List size={14} />
            <ChevronDown size={12} />
          </button>
        </Tooltip>

        {showListMenu && (
          <div
            ref={listMenuRef}
            className="absolute top-full left-0 mt-1 rounded shadow-lg z-50"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              minWidth: '160px',
            }}
          >
            <button
              onClick={handleBulletList}
              className="w-full text-left px-3 py-1.5 hover:bg-(--bg-tertiary) transition-colors flex items-center gap-2"
              style={{
                fontSize: '13px',
                color: 'var(--text-primary)',
              }}
            >
              <List size={14} />
              <span>Bullet list</span>
            </button>
            <button
              onClick={handleNumberedList}
              className="w-full text-left px-3 py-1.5 hover:bg-(--bg-tertiary) transition-colors flex items-center gap-2"
              style={{
                fontSize: '13px',
                color: 'var(--text-primary)',
              }}
            >
              <ListOrdered size={14} />
              <span>Numbered list</span>
            </button>
            <button
              onClick={handleTaskList}
              className="w-full text-left px-3 py-1.5 hover:bg-(--bg-tertiary) transition-colors flex items-center gap-2"
              style={{
                fontSize: '13px',
                color: 'var(--text-primary)',
              }}
            >
              <CheckSquare size={14} />
              <span>Task list</span>
            </button>
          </div>
        )}
      </div>

      <Separator />

      {/* Text Formatting - With style preview */}
      <Tooltip content="Bold (Ctrl+B)" delay={300}>
        <button
          onClick={handleBold}
          className="p-1.5 rounded hover:bg-(--bg-tertiary) transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          <span style={{ fontWeight: 700, fontSize: '14px' }}>B</span>
        </button>
      </Tooltip>
      <Tooltip content="Italic (Ctrl+I)" delay={300}>
        <button
          onClick={handleItalic}
          className="p-1.5 rounded hover:bg-(--bg-tertiary) transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          <span style={{ fontStyle: 'italic', fontSize: '14px' }}>I</span>
        </button>
      </Tooltip>
      <Tooltip content="Strikethrough" delay={300}>
        <button
          onClick={handleStrikethrough}
          className="p-1.5 rounded hover:bg-(--bg-tertiary) transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          <span style={{ textDecoration: 'line-through', fontSize: '14px' }}>S</span>
        </button>
      </Tooltip>
      <Tooltip content="Inline code" delay={300}>
        <button
          onClick={handleInlineCode}
          className="p-1.5 rounded hover:bg-(--bg-tertiary) transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          <Code size={14} />
        </button>
      </Tooltip>

      <Separator />

      {/* Insert */}
      <ToolButton onClick={handleLink} title="Insert link" icon={LinkIcon} />
      <ToolButton onClick={handleImage} title="Insert image" icon={ImageIcon} />

      <Separator />

      {/* Blocks */}
      <ToolButton onClick={handleBlockquote} title="Blockquote" icon={Quote} />
      <ToolButton onClick={handleCodeBlock} title="Code block" icon={FileCode} />
      <ToolButton onClick={handleHorizontalRule} title="Horizontal rule" icon={Minus} placement="top-right" />
    </div>
  );
};

export default MarkdownToolbar;
