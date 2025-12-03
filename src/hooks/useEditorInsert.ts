import { useRef, useCallback } from 'react';
import type { EditorView } from '@codemirror/view';

/**
 * Hook to handle text insertion in CodeMirror editor
 */
export const useEditorInsert = () => {
  const editorViewRef = useRef<EditorView | null>(null);

  const handleInsert = useCallback((text: string, offset?: number) => {
    const view = editorViewRef.current;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const newPos = from + text.length + (offset || 0);

    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: newPos },
      scrollIntoView: true  // Auto-scroll to cursor
    });

    view.focus();
  }, []);

  return { editorViewRef, handleInsert };
};
