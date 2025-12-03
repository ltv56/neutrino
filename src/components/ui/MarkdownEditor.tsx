import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import type { ViewUpdate } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { getLanguageSupport } from './markdown-editor/config/languageSupport';
import { listKeymap } from './markdown-editor/config/listKeymap';
import { markdownTheme, highlightingExtension } from './markdown-editor/theme/editorTheme';
import { livePreviewPlugin } from './markdown-editor/plugins/livePreviewPlugin';

interface MarkdownEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onEditorReady?: (view: EditorView) => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start typing...',
  autoFocus = false,
  onEditorReady,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isInternalUpdate = useRef(false);
  const onChangeRef = useRef(onChange);

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
      keymap.of([...listKeymap, ...defaultKeymap, ...historyKeymap]),
      highlightingExtension,
      livePreviewPlugin,
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged && !isInternalUpdate.current) {
          const newContent = update.state.doc.toString();
          console.log('[CodeMirror] onChange:', newContent);
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
    if (currentContent !== content) {
      isInternalUpdate.current = true;
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content,
        },
      });
      setTimeout(() => {
        isInternalUpdate.current = false;
      }, 0);
    }
  }, [content]);

  return (
    <div
      ref={editorRef}
      style={{
        height: '100%',
        overflow: 'auto',
      }}
    />
  );
};

export default MarkdownEditor;
