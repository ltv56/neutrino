import React, { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import type { ViewUpdate } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { getLanguageSupport } from './markdown-editor/config/languageSupport';
import { listKeymap } from './markdown-editor/config/listKeymap';
import { blockKeymap } from './markdown-editor/config/blockKeymap';
import { markdownTheme, highlightingExtension } from './markdown-editor/theme/editorTheme';
import { livePreviewPlugin } from './markdown-editor/plugins/livePreviewPlugin';

interface MarkdownEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
  onEditorReady?: (view: EditorView) => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start typing...',
  autoFocus = false,
  readOnly = false,
  onEditorReady,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const editableCompartment = useRef(new Compartment());
  const isInternalUpdate = useRef(false);
  const onChangeRef = useRef(onChange);
  const pendingContent = useRef<string | null>(null);

  // Keep onChange ref updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!editorRef.current) return;

    const extensions = [
      markdown({
        base: markdownLanguage,
        codeLanguages: getLanguageSupport
      }),
      markdownTheme,
      history(),
      keymap.of([...blockKeymap, ...listKeymap, ...defaultKeymap, ...historyKeymap]),
      highlightingExtension,
      livePreviewPlugin,
      editableCompartment.current.of(EditorView.editable.of(!readOnly)),
      EditorView.contentAttributes.of(readOnly ? { tabindex: '-1' } : {}),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged && !isInternalUpdate.current) {
          const newContent = update.state.doc.toString();
          pendingContent.current = newContent;
          onChangeRef.current(newContent);
        }
      }),
      EditorView.lineWrapping,
    ];

    const startState = EditorState.create({
      doc: content,
      extensions,
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    if (autoFocus) {
      view.focus();
    }

    // Notify parent of editor ready
    if (onEditorReady) {
      onEditorReady(view);
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update content when it changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();

    // Skip if this is the content we just emitted (prevent loop)
    if (pendingContent.current === content) {
      pendingContent.current = null;
      return;
    }

    // Only update if content actually different
    if (currentContent !== content) {
      isInternalUpdate.current = true;

      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content,
        },
      });

      // Reset flag synchronously after dispatch completes
      queueMicrotask(() => {
        isInternalUpdate.current = false;
      });
    }
  }, [content]);

  // Update editable state when readOnly changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    // Reconfigure editable state using compartment
    view.dispatch({
      effects: editableCompartment.current.reconfigure(EditorView.editable.of(!readOnly))
    });

    // Force rebuild decorations by triggering selection update
    view.dispatch({
      selection: view.state.selection
    });
  }, [readOnly]);

  return (
    <div
      ref={editorRef}
      className={readOnly ? 'reading-mode' : ''}
      style={{
        height: '100%',
        overflow: 'auto',
      }}
    />
  );
};

export default MarkdownEditor;
