import { EditorView } from '@codemirror/view';
import type { KeyBinding } from '@codemirror/view';

/**
 * Handle Enter key in markdown lists
 * - Creates new list items automatically
 */
const handleEnterInList = (view: EditorView): boolean => {
  const { state } = view;
  const { from, to } = state.selection.main;

  // Only handle if cursor is at single position (not a selection)
  if (from !== to) return false;

  const line = state.doc.lineAt(from);
  const lineText = line.text;

  // Check for incomplete bullet: just - or * without space
  const incompleteBulletMatch = lineText.match(/^(\s*)([*-])$/);
  if (incompleteBulletMatch) {
    const [, indent, marker] = incompleteBulletMatch;

    // Complete the bullet by adding space, then create new bullet
    view.dispatch({
      changes: [
        {
          from: line.from,
          to: line.to,
          insert: `${indent}${marker} `
        },
        {
          from: line.to,
          to: line.to,
          insert: `\n${indent}${marker} `
        }
      ],
      selection: { anchor: line.to + indent.length + marker.length + 2 }
    });
    return true;
  }

  // Check for bullet list: - item or * item
  const bulletMatch = lineText.match(/^(\s*)([*-])\s+(.*)$/);
  if (bulletMatch) {
    const [, indent, marker] = bulletMatch;

    // Create new bullet
    view.dispatch({
      changes: {
        from,
        to,
        insert: `\n${indent}${marker} `
      },
      selection: { anchor: from + indent.length + marker.length + 2 }
    });
    return true;
  }

  // Check for numbered list: 1. item
  const numberedMatch = lineText.match(/^(\s*)(\d+)\.\s+(.*)$/);
  if (numberedMatch) {
    const [, indent, num] = numberedMatch;

    // Create new numbered item
    const nextNum = parseInt(num) + 1;
    view.dispatch({
      changes: {
        from,
        to,
        insert: `\n${indent}${nextNum}. `
      },
      selection: { anchor: from + indent.length + nextNum.toString().length + 3 }
    });
    return true;
  }

  // Check for task list: - [ ] item or - [x] item
  const taskMatch = lineText.match(/^(\s*)([*-])\s+\[([ xX])\]\s+(.*)$/);
  if (taskMatch) {
    const [, indent, marker] = taskMatch;

    // Create new task
    view.dispatch({
      changes: {
        from,
        to,
        insert: `\n${indent}${marker} [ ] `
      },
      selection: { anchor: from + indent.length + marker.length + 6 }
    });
    return true;
  }

  return false;
};

/**
 * Handle Tab key in markdown lists (indent)
 */
const handleTabInList = (view: EditorView): boolean => {
  const { state } = view;
  const { from, to } = state.selection.main;

  if (from !== to) return false;

  const line = state.doc.lineAt(from);
  const lineText = line.text;

  // Check if we're in any kind of list
  if (lineText.match(/^\s*([*-]|\d+\.)\s+/) || lineText.match(/^\s*[*-]\s+\[([ xX])\]\s+/)) {
    view.dispatch({
      changes: {
        from: line.from,
        to: line.from,
        insert: '  ' // 2 spaces indent
      },
      selection: { anchor: from + 2 }
    });
    return true;
  }

  return false;
};

/**
 * Handle Shift+Tab key in markdown lists (outdent)
 */
const handleShiftTabInList = (view: EditorView): boolean => {
  const { state } = view;
  const { from, to } = state.selection.main;

  if (from !== to) return false;

  const line = state.doc.lineAt(from);
  const lineText = line.text;

  // Check if line starts with spaces
  const spaceMatch = lineText.match(/^(\s{1,2})/);
  if (spaceMatch && (lineText.match(/^\s*([*-]|\d+\.)\s+/) || lineText.match(/^\s*[*-]\s+\[([ xX])\]\s+/))) {
    const spacesToRemove = spaceMatch[1].length;
    view.dispatch({
      changes: {
        from: line.from,
        to: line.from + spacesToRemove,
        insert: ''
      },
      selection: { anchor: from - spacesToRemove }
    });
    return true;
  }

  return false;
};

export const listKeymap: KeyBinding[] = [
  {
    key: 'Enter',
    run: handleEnterInList
  },
  {
    key: 'Tab',
    run: handleTabInList
  },
  {
    key: 'Shift-Tab',
    run: handleShiftTabInList
  }
];
