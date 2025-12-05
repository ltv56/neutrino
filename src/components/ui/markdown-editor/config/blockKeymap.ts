import { EditorView } from '@codemirror/view';
import type { KeyBinding } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

/**
 * Handle Ctrl+Enter to exit code blocks and quotes
 */
const handleCtrlEnterInBlock = (view: EditorView): boolean => {
  const { state } = view;
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);
  const lineText = line.text;

  // Check if we're in a quote (simpler check)
  if (lineText.match(/^>\s*/)) {
    // Exit quote: create new line after current line without > prefix
    view.dispatch({
      changes: {
        from: line.to,
        to: line.to,
        insert: '\n'
      },
      selection: { anchor: line.to + 1 }
    });
    return true;
  }

  // Get syntax tree to detect if we're in a code block
  const tree = syntaxTree(state);
  let node = tree.resolveInner(from, -1);

  // Traverse up to find if we're in a FencedCode
  while (node) {
    if (node.name === 'FencedCode') {
      // Insert newline after the code block
      view.dispatch({
        changes: {
          from: node.to,
          to: node.to,
          insert: '\n'
        },
        selection: { anchor: node.to + 1 }
      });
      return true;
    }
    if (!node.parent) break;
    node = node.parent;
  }

  return false;
};

/**
 * Handle Enter key when cursor is right after closing ``` of code block
 */
const handleEnterAfterCodeBlock = (view: EditorView): boolean => {
  const { state } = view;
  const { from, to } = state.selection.main;

  // Only handle if cursor is at single position (not a selection)
  if (from !== to) return false;

  const line = state.doc.lineAt(from);
  const lineText = line.text;

  // Check if current line is ``` and cursor is at the end
  if (lineText.trim() === '```' && from === line.to) {
    // Check if there's a line below
    const hasLineBelow = line.to < state.doc.length;

    if (!hasLineBelow || state.doc.lineAt(line.to + 1).text.trim() === '') {
      // Insert newline after code block
      view.dispatch({
        changes: {
          from: line.to,
          to: line.to,
          insert: '\n'
        },
        selection: { anchor: line.to + 1 }
      });
      return true;
    }
  }

  return false;
};

/**
 * Handle Down arrow when at end of code block or quote
 */
const handleDownArrowExit = (view: EditorView): boolean => {
  const { state } = view;
  const { from } = state.selection.main;
  const line = state.doc.lineAt(from);

  // Check if cursor is at end of line
  if (from !== line.to) return false;

  const lineText = line.text;

  // If on closing ``` line
  if (lineText.trim() === '```') {
    // Check if there's a line below
    if (line.to < state.doc.length) {
      const nextLine = state.doc.lineAt(line.to + 1);

      // Move cursor to next line
      view.dispatch({
        selection: { anchor: nextLine.from }
      });
      return true;
    } else {
      // No line below, create one
      view.dispatch({
        changes: {
          from: line.to,
          to: line.to,
          insert: '\n'
        },
        selection: { anchor: line.to + 1 }
      });
      return true;
    }
  }

  // If in quote block (line starts with >)
  if (lineText.match(/^>\s*/)) {
    // Check if next line is also a quote
    if (line.to < state.doc.length) {
      const nextLine = state.doc.lineAt(line.to + 1);

      // If next line is NOT a quote, exit the quote
      if (!nextLine.text.match(/^>\s*/)) {
        view.dispatch({
          selection: { anchor: nextLine.from }
        });
        return true;
      }
    } else {
      // No line below, create one outside quote
      view.dispatch({
        changes: {
          from: line.to,
          to: line.to,
          insert: '\n'
        },
        selection: { anchor: line.to + 1 }
      });
      return true;
    }
  }

  return false;
};

export const blockKeymap: KeyBinding[] = [
  {
    key: 'Ctrl-Enter',
    run: handleCtrlEnterInBlock
  },
  {
    key: 'Enter',
    run: handleEnterAfterCodeBlock
  },
  {
    key: 'ArrowDown',
    run: handleDownArrowExit
  }
];
