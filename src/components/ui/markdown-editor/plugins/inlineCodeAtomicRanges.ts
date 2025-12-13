import { EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';

/**
 * Extension that makes inline code backticks atomic (non-navigable) when cursor is not on the same line
 * This allows cursor to skip over backticks during vertical navigation (like Obsidian)
 */
export const inlineCodeAtomicRanges = EditorView.atomicRanges.of((view) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder = new RangeSetBuilder<any>();
  const cursorPos = view.state.selection.main.head;

  syntaxTree(view.state).iterate({
    enter: (node) => {
      // Add null check for node
      if (!node || !node.from || !node.to) return;

      if (node.name === 'InlineCode') {
        const line = view.state.doc.lineAt(node.from);
        const cursorOnSameLine = cursorPos >= line.from && cursorPos <= line.to;

        // Only make backticks atomic when cursor is NOT on the same line
        if (!cursorOnSameLine) {
          // Opening backtick
          builder.add(node.from, node.from + 1, null);
          // Closing backtick
          builder.add(node.to - 1, node.to, null);
        }
      }
    },
  });

  return builder.finish();
});
