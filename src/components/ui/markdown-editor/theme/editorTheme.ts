import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Custom syntax highlighting with semantic class names
export const customHighlighting = HighlightStyle.define([
  // Markdown elements
  { tag: tags.heading1, class: 'cm-heading cm-heading-1' },
  { tag: tags.heading2, class: 'cm-heading cm-heading-2' },
  { tag: tags.heading3, class: 'cm-heading cm-heading-3' },
  { tag: tags.heading4, class: 'cm-heading cm-heading-4' },
  { tag: tags.heading5, class: 'cm-heading cm-heading-5' },
  { tag: tags.heading6, class: 'cm-heading cm-heading-6' },
  { tag: tags.strong, class: 'cm-strong' },
  { tag: tags.emphasis, class: 'cm-em' },
  { tag: tags.strikethrough, class: 'cm-strikethrough' },
  { tag: tags.link, class: 'cm-link' },
  { tag: tags.url, class: 'cm-url' },
  { tag: tags.monospace, class: 'cm-inlineCode' },
  { tag: tags.quote, class: 'cm-quote' },
  { tag: tags.list, class: 'cm-list' },

  // Code syntax highlighting - One Dark theme
  { tag: tags.keyword, color: '#c678dd !important' }, // Purple - keywords
  { tag: tags.function(tags.variableName), color: '#61afef !important' }, // Blue - functions
  { tag: tags.string, color: '#98c379 !important' }, // Green - strings
  { tag: tags.comment, color: '#5c6370 !important', fontStyle: 'italic' }, // Gray - comments
  { tag: tags.number, color: '#d19a66 !important' }, // Orange - numbers
  { tag: tags.bool, color: '#d19a66 !important' }, // Orange - booleans
  { tag: tags.operator, color: '#56b6c2 !important' }, // Cyan - operators
  { tag: tags.punctuation, color: '#abb2bf !important' }, // Light gray - punctuation
  { tag: tags.variableName, color: '#e06c75 !important' }, // Red - variables
  { tag: tags.className, color: '#e6c07b !important' }, // Yellow - classes
  { tag: tags.typeName, color: '#e6c07b !important' }, // Yellow - types
  { tag: tags.propertyName, color: '#e06c75 !important' }, // Red - properties
  { tag: tags.regexp, color: '#98c379 !important' }, // Green - regex
]);

// Theme extension - matching TipTap design
export const markdownTheme = EditorView.theme({
  '&': {
    fontSize: '14px',
    height: '100%',
    backgroundColor: 'transparent',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    letterSpacing: '0px !important',
  },
  '.cm-content': {
    padding: '0.5rem 1rem 1rem 1rem',
    caretColor: 'var(--text-primary)',
    minHeight: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  '.cm-line': {
    lineHeight: '1.7',
    color: 'var(--text-primary)',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--text-primary)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--accent) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--accent) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.cm-gutters': {
    display: 'none',
  },

  // ALL Markdown syntax - hide underlines globally
  '.cm-headerMark, .cm-heading, .cm-heading-1, .cm-heading-2, .cm-heading-3, .cm-heading-4, .cm-heading-5, .cm-heading-6': {
    textDecoration: 'none !important',
  },

  // Heading marks in edit mode - inherit size and weight from line
  '.cm-heading-mark': {
    color: 'var(--text-secondary) !important',
    fontWeight: 'inherit !important',
    fontSize: 'inherit !important',
    opacity: '0.7',
  },

  // Inline code - red text with background (NOT in code blocks)
  '.cm-line:not(.cm-codeblock-line) .cm-inlineCode': {
    fontFamily: "'JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Fira Mono', 'Roboto Mono', Consolas, 'Courier New', monospace !important",
    fontSize: '0.85em !important',
    color: '#eb5757 !important',
  },

  // Expanded inline code - background covers full range including backtick positions
  '.cm-line:not(.cm-codeblock-line) .cm-inline-code-expanded': {
    backgroundColor: 'rgba(135, 131, 120, 0.15) !important',
    borderRadius: '3px !important',
    padding: '0em 0.25em !important',
  },
  // Backticks in inline code - make them subtle
  '.cm-line:not(.cm-codeblock-line) .cm-inline-code-backtick': {
    opacity: '0 !important',
  },

  // Code blocks - reset inline code styling (remove background/padding that applies outside code blocks)
  '.cm-codeblock-line .cm-inlineCode': {
    fontFamily: "'JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Fira Mono', 'Roboto Mono', Consolas, 'Courier New', monospace !important",
    fontSize: 'inherit !important',
    backgroundColor: 'transparent !important',
    borderRadius: '0 !important',
    padding: '0 !important',
  },

  // Code block lines - Obsidian-style unified container
  '.cm-codeblock-line': {
    position: 'relative',
    fontFamily: "'JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Fira Mono', 'Roboto Mono', Consolas, 'Courier New', monospace !important",
    fontSize: '0.875em !important',
    backgroundColor: 'rgba(135, 131, 120, 0.15) !important',
    borderLeft: '1px solid rgba(135, 131, 120, 0.2) !important',
    borderRight: '1px solid rgba(135, 131, 120, 0.2) !important',
    padding: '0 0.75em !important',
    margin: '0 !important',
    lineHeight: '1.6 !important',
  },
  '.cm-codeblock-first': {
    borderTop: '1px solid rgba(135, 131, 120, 0.2) !important',
    borderRadius: '5px 5px 0 0 !important',
    marginTop: '0.75em !important',
    paddingTop: '0.5em !important',
  },
  '.cm-codeblock-last': {
    borderBottom: '1px solid rgba(135, 131, 120, 0.2) !important',
    borderRadius: '0 0 5px 5px !important',
    marginBottom: '0.75em !important',
  },
  // Fence marks in edit mode - style exactly like code content
  '.cm-codeblock-fence-mark, .cm-codeblock-fence-mark *, .cm-codeblock-line .cm-fencedCode, .cm-codeblock-line .cm-codeMark': {
    fontFamily: "'JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Fira Mono', 'Roboto Mono', Consolas, 'Courier New', monospace !important",
    fontSize: 'inherit !important',
    color: 'var(--text-primary) !important',
    backgroundColor: 'transparent !important',
    fontWeight: 'normal !important',
  },
  '.cm-codeblock-controls': {
    position: 'absolute !important',
    top: '0.25em !important',
    left: '0 !important',
    right: '0 !important',
    display: 'flex !important',
    zIndex: '10 !important',
    height: 'inherit !important',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0em 0.75em',
    pointerEvents: 'none',
  },
  '.cm-codeblock-controls-left': {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5em',
  },
  '.cm-codeblock-controls-right': {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5em',
    pointerEvents: 'auto',
  },
  '.cm-codeblock-language': {
    fontSize: '0.7em',
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: "'JetBrains Mono', 'SF Mono', Monaco, Consolas, monospace",
    fontWeight: '400',
    letterSpacing: '0.05em',
    padding: '0.25em 0.5em',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '3px',
    pointerEvents: 'none',
  },
  '.cm-codeblock-copy-button': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.4em',
    fontSize: '0.75em',
    color: 'rgba(255, 255, 255, 0.5)',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    opacity: '0.7',
    backgroundColor: 'transparent',
  },
  '.cm-codeblock-copy-button:hover': {
    opacity: '1',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  '.cm-codeblock-copy-button.copied': {
    color: 'var(--accent)',
  },

  // Links - accent color
  '.cm-link, .cm-url': {
    color: 'var(--accent) !important',
    textDecoration: 'underline !important',
    cursor: 'pointer',
  },

  // Bold
  '.cm-strong, .cm-strongEmphasis': {
    fontWeight: '700 !important',
  },

  // Italic
  '.cm-em, .cm-emphasis': {
    fontStyle: 'italic !important',
  },

  // Strikethrough
  '.cm-strikethrough': {
    textDecoration: 'line-through !important',
  },

  // List markers (bullets and numbers) - primary text color
  '.cm-list-1, .cm-list-2, .cm-list-3, .cm-listMark': {
    color: 'var(--text-primary) !important',
  },

  // Blockquote marks
  '.cm-quote, .cm-quoteMark': {
    color: 'var(--text-secondary) !important',
    fontStyle: 'italic !important',
    fontFamily: '"Playfair Display", serif',
    fontSize: '1.1em !important',
  },
  // Task checkboxes
  '.cm-task-checkbox': {
    display: 'inline-flex',
    alignItems: 'center',
    verticalAlign: 'middle',
  },
  '.cm-task-checkbox-input': {
    width: '16px !important',
    height: '16px !important',
    minWidth: '16px',
    minHeight: '16px',
    maxWidth: '16px',
    maxHeight: '16px',
    margin: '0 0.5em 0 0',
    padding: '0 !important',
    cursor: 'pointer',
    border: '1.5px solid var(--border)',
    borderRadius: '3px',
    backgroundColor: 'transparent',
    position: 'relative',
    verticalAlign: 'middle',
    boxSizing: 'border-box !important',
    flexShrink: '0',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  '.cm-task-checkbox-input.checked': {
    backgroundColor: 'var(--accent)',
    borderColor: 'var(--accent)',
  },
  '.cm-task-checkbox-icon': {
    color: 'white',
    display: 'block',
  },
  // Bullet marker
  '.cm-bullet-marker': {
    marginRight: '0.5em',
  },
  // Horizontal rule line
  '.cm-hr-line': {
    borderTop: '2px solid rgba(135, 131, 120, 0.3)',
    margin: '1.5em 0',
    height: '2px',
  },
  // Blockquote line
  '.cm-blockquote-line': {
    borderLeft: '3px solid var(--accent)',
    paddingLeft: '1em',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
    fontFamily: '"Playfair Display", serif',
  },
});

export const highlightingExtension = syntaxHighlighting(customHighlighting);
