import { ViewPlugin, Decoration, WidgetType, EditorView as EditorViewBase } from '@codemirror/view';
import type { EditorView, DecorationSet } from '@codemirror/view';
import type { ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { CheckboxWidget } from '../widgets/CheckboxWidget';
import { CodeBlockCopyWidget } from '../widgets/CodeBlockCopyWidget';
import { ImageWidget } from '../widgets/ImageWidget';
import { RangeSet } from '@codemirror/state';

export const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const decorations = [];
      const cursorPos = view.state.selection.main.head;
      const doc = view.state.doc;

      // Check if in reading mode (parent has reading-mode class)
      const isReadingMode = (view.dom.parentElement?.classList.contains('reading-mode')) || false;

      // Process each line for block-level decorations
      for (let pos = 0; pos < doc.length;) {
        const line = doc.lineAt(pos);
        const text = line.text;
        const cursorInLine = cursorPos >= line.from && cursorPos <= line.to;

        // Task lists: - [ ] or - [x]
        const taskMatch = text.match(/^(\s*)-\s+\[([ xX])\]\s+/);
        if (taskMatch) {
          const checked = taskMatch[2].toLowerCase() === 'x';
          const checkboxPos = line.from + taskMatch[1].length;
          const matchEnd = checkboxPos + taskMatch[0].length - taskMatch[1].length;

          if (!cursorInLine || isReadingMode) {
            decorations.push(
              Decoration.replace({
                widget: new CheckboxWidget(checked, line.from, view),
                inclusive: false,
                block: false
              }).range(checkboxPos, matchEnd)
            );
          }
        }
        // Bullet lists: hide - and show • (with or without space/content)
        else if (text.match(/^(\s*)[*-](\s|$)/) && !text.match(/^-{3,}/)) {
          const bulletMatch = text.match(/^(\s*)[*-](\s|$)/);
          if (bulletMatch && (!cursorInLine || isReadingMode)) {
            const bulletStart = line.from + bulletMatch[1].length;
            decorations.push(Decoration.replace({}).range(bulletStart, bulletStart + 1));
            decorations.push(
              Decoration.widget({
                widget: new (class extends WidgetType {
                  toDOM() {
                    const span = document.createElement('span');
                    span.textContent = '• ';
                    span.className = 'cm-bullet-marker';
                    return span;
                  }
                })(),
                side: 1
              }).range(bulletStart)
            );
          }
        }
        // Horizontal rule: ---
        else if (text.match(/^-{3,}$/)) {
          if (!cursorInLine || isReadingMode) {
            // Hide the --- text
            decorations.push(Decoration.replace({}).range(line.from, line.to));
            // Add line decoration for styling
            decorations.push(
              Decoration.line({
                attributes: {
                  class: 'cm-hr-line'
                }
              }).range(line.from)
            );
          }
        }

        // Wiki links: [[...]] - detect and style bidirectional links
        const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
        let wikiMatch;
        while ((wikiMatch = wikiLinkRegex.exec(text)) !== null) {
          const fullMatch = wikiMatch[0];
          const linkText = wikiMatch[1];
          const matchStart = line.from + wikiMatch.index;
          const matchEnd = matchStart + fullMatch.length;
          const cursorInWikiLink = cursorPos >= matchStart && cursorPos < matchEnd;

          if (!cursorInWikiLink || isReadingMode) {
            // Preview mode: hide [[ and ]] brackets, style link text
            decorations.push(Decoration.replace({}).range(matchStart, matchStart + 2)); // Hide [[
            decorations.push(Decoration.replace({}).range(matchEnd - 2, matchEnd)); // Hide ]]
            decorations.push(
              Decoration.mark({
                class: 'cm-wikilink-text'
              }).range(matchStart + 2, matchEnd - 2)
            );
          } else {
            // Edit mode: style entire [[link]] with subtle highlight
            decorations.push(
              Decoration.mark({
                class: 'cm-wikilink-editing'
              }).range(matchStart, matchEnd)
            );
          }
        }

        pos = line.to + 1;
      }

      // Process markdown syntax tree for other elements
      syntaxTree(view.state).iterate({
        enter: (node) => {
          const nodeText = view.state.doc.sliceString(node.from, node.to);
          const cursorInNode = cursorPos >= node.from && cursorPos <= node.to;

          // Headings - hide/style hash marks and apply sizing
          if (node.name === 'ATXHeading1' || node.name === 'ATXHeading2' ||
            node.name === 'ATXHeading3' || node.name === 'ATXHeading4' ||
            node.name === 'ATXHeading5' || node.name === 'ATXHeading6') {
            const match = nodeText.match(/^(#{1,6})\s+/);
            if (match) {
              const level = match[1].length;
              const sizes = ['2em', '1.5em', '1.25em', '1.1em', '1em', '0.875em'];
              const line = view.state.doc.lineAt(node.from);

              if (!cursorInNode || isReadingMode) {
                // Preview: hide hash marks
                decorations.push(Decoration.replace({}).range(node.from, node.from + match[1].length + 1));
              } else {
                // Edit: style hash marks with same size/weight
                decorations.push(
                  Decoration.mark({
                    class: 'cm-heading-mark'
                  }).range(node.from, node.from + match[1].length + 1)
                );
              }

              // Apply line decoration for sizing in both modes
              decorations.push(
                Decoration.line({
                  attributes: {
                    style: `font-size: ${sizes[level - 1]}; font-weight: 600; line-height: 1.3;`
                  }
                }).range(line.from)
              );
            }
          }

          // Skip other elements if cursor is in them (show raw syntax) - unless in reading mode
          if (cursorInNode && !isReadingMode) {
            // Only skip elements that should show raw markdown
            // Keep styling for: headings, code blocks, inline code, blockquotes
            if (node.name !== 'ATXHeading1' && node.name !== 'ATXHeading2' &&
              node.name !== 'ATXHeading3' && node.name !== 'ATXHeading4' &&
              node.name !== 'ATXHeading5' && node.name !== 'ATXHeading6' &&
              node.name !== 'FencedCode' && node.name !== 'InlineCode' &&
              node.name !== 'Blockquote') {
              return;
            }
          }

          // Bold - hide ** or __
          if (node.name === 'StrongEmphasis') {
            const marks = nodeText.startsWith('**') ? '**' : '__';
            decorations.push(Decoration.replace({}).range(node.from, node.from + marks.length));
            decorations.push(Decoration.replace({}).range(node.to - marks.length, node.to));
          }

          // Italic - hide * or _
          if (node.name === 'Emphasis') {
            const marks = nodeText.startsWith('*') ? '*' : '_';
            if (marks.length === 1) {
              decorations.push(Decoration.replace({}).range(node.from, node.from + 1));
              decorations.push(Decoration.replace({}).range(node.to - 1, node.to));
            }
          }

          // Strikethrough - hide ~~
          if (node.name === 'Strikethrough') {
            decorations.push(Decoration.replace({}).range(node.from, node.from + 2));
            decorations.push(Decoration.replace({}).range(node.to - 2, node.to));
          }

          // Inline code - hide backticks when cursor not on same line (Obsidian-style)
          if (node.name === 'InlineCode') {
            const line = view.state.doc.lineAt(node.from);
            const cursorOnSameLine = cursorPos >= line.from && cursorPos <= line.to;

            if (!cursorOnSameLine || isReadingMode) {
              // Cursor on different line or reading mode: hide backticks completely
              decorations.push(Decoration.replace({}).range(node.from, node.from + 1));
              decorations.push(Decoration.replace({}).range(node.to - 1, node.to));

              // Add background to content only
              if (node.to - node.from > 2) {
                decorations.push(
                  Decoration.mark({
                    class: 'cm-inline-code-preview'
                  }).range(node.from + 1, node.to - 1)
                );
              }
            } else if (!cursorInNode) {
              // Cursor on same line but not in node: show with background
              decorations.push(
                Decoration.mark({
                  class: 'cm-inline-code-preview'
                }).range(node.from, node.to)
              );
            }
          }

          // Links - hide markdown link syntax
          if (node.name === 'Link') {
            const linkMatch = nodeText.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch) {
              // Hide [
              decorations.push(Decoration.replace({}).range(node.from, node.from + 1));
              // Hide ](url)
              const textEnd = node.from + 1 + linkMatch[1].length;
              decorations.push(Decoration.replace({}).range(textEnd, node.to));
            }
          }

          // Images - render inline in preview mode
          if (node.name === 'Image') {
            const imageMatch = nodeText.match(/!\[([^\]]*)\]\(([^)]+)\)/);
            if (imageMatch) {
              const [, alt, src] = imageMatch;

              if (!cursorInNode || isReadingMode) {
                // Preview mode or reading mode: replace with image widget
                decorations.push(
                  Decoration.replace({
                    widget: new ImageWidget(alt, src)
                  }).range(node.from, node.to)
                );
              }
            }
          }

          // Code blocks - Obsidian style (preview/edit mode)
          if (node.name === 'FencedCode') {
            const lines = nodeText.split('\n');
            if (lines[0].startsWith('```')) {
              // Extract language
              const language = lines[0].replace(/^```/, '').trim();

              // Extract code content (for copy)
              const codeContent = lines.slice(1, lines[lines.length - 1].trim() === '```' ? -1 : lines.length).join('\n');

              const doc = view.state.doc;
              const firstLineEnd = node.from + lines[0].length;
              const firstLine = doc.lineAt(node.from);
              const lastLine = doc.lineAt(node.to);

              // Check if cursor is in code block
              const inEditMode = cursorInNode && !isReadingMode;

              // Collect all lines
              const allLines = [];
              for (let pos = node.from; pos < node.to;) {
                const line = doc.lineAt(pos);
                allLines.push(line);
                pos = line.to + 1;
              }

              if (!inEditMode) {
                // Preview mode: hide fence marks
                decorations.push(Decoration.replace({}).range(node.from, firstLineEnd));

                if (lines.length > 1 && lines[lines.length - 1].trim() === '```') {
                  const lastLineStart = node.to - lines[lines.length - 1].length;
                  decorations.push(Decoration.replace({}).range(lastLineStart, node.to));
                }
              } else {
                // Edit mode: style fence marks like code
                decorations.push(
                  Decoration.mark({
                    class: 'cm-codeblock-fence-mark'
                  }).range(node.from, firstLineEnd)
                );

                if (lines.length > 1 && lines[lines.length - 1].trim() === '```') {
                  const lastLineStart = node.to - lines[lines.length - 1].length;
                  decorations.push(
                    Decoration.mark({
                      class: 'cm-codeblock-fence-mark'
                    }).range(lastLineStart, node.to)
                  );
                }
              }

              // Apply styling to all lines (fence + content)
              allLines.forEach((line, index) => {
                const isFirstLine = index === 0;
                const isLastLine = index === allLines.length - 1;

                const classes = ['cm-codeblock-line'];

                // Apply first/last styling
                if (isFirstLine) classes.push('cm-codeblock-first');
                if (isLastLine) classes.push('cm-codeblock-last');

                decorations.push(
                  Decoration.line({
                    attributes: {
                      class: classes.join(' '),
                      'data-language': language,
                    }
                  }).range(line.from)
                );

                // Add copy button on first line in preview mode only
                if (!inEditMode && isFirstLine) {
                  decorations.push(
                    Decoration.widget({
                      widget: new CodeBlockCopyWidget(language, codeContent),
                      side: 1
                    }).range(line.from)
                  );
                }
              });
            }
          }

          // Blockquotes - hide > marks and add styling
          if (node.name === 'Blockquote') {
            const doc = view.state.doc;
            for (let pos = node.from; pos < node.to;) {
              const line = doc.lineAt(pos);
              const lineText = line.text;
              const cursorInQuoteLine = cursorPos >= line.from && cursorPos <= line.to;
              const match = lineText.match(/^>\s?/);

              if (match && (!cursorInQuoteLine || isReadingMode)) {
                // Preview mode or reading mode: hide > marks and style
                decorations.push(Decoration.replace({}).range(line.from, line.from + match[0].length));
                decorations.push(
                  Decoration.line({
                    attributes: {
                      class: 'cm-blockquote-line'
                    }
                  }).range(line.from)
                );
              }
              pos = line.to + 1;
            }
          }
        }
      });

      return Decoration.set(decorations.sort((a, b) => a.from - b.from), true);
    }
  },
  {
    decorations: (v) => v.decorations
  }
);
