import { WidgetType } from '@codemirror/view';

// Lucide Copy icon SVG
const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;

// Lucide Check icon SVG
const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

export class CodeBlockCopyWidget extends WidgetType {
  language: string;
  codeText: string;

  constructor(language: string, codeText: string) {
    super();
    this.language = language || 'text';
    this.codeText = codeText;
  }

  toDOM() {
    const container = document.createElement('div');
    container.className = 'cm-codeblock-controls';

    // Language label - on the left
    const leftSide = document.createElement('div');
    leftSide.className = 'cm-codeblock-controls-left';

    const languageLabel = document.createElement('span');
    languageLabel.className = 'cm-codeblock-language';
    // Show "TEXT" for empty or "text" language
    const displayLanguage = (!this.language || this.language === 'text') ? 'TEXT' : this.language.toUpperCase();
    languageLabel.textContent = displayLanguage;
    leftSide.appendChild(languageLabel);

    container.appendChild(leftSide);

    // Right side - copy button with tooltip
    const rightSide = document.createElement('div');
    rightSide.className = 'cm-codeblock-controls-right';

    // Copy button
    const button = document.createElement('button');
    button.className = 'cm-codeblock-copy-button';
    button.title = 'Copy code';
    button.innerHTML = COPY_ICON;

    button.onclick = async (e) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(this.codeText);
        button.innerHTML = CHECK_ICON;
        button.classList.add('copied');
        setTimeout(() => {
          button.innerHTML = COPY_ICON;
          button.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    };

    rightSide.appendChild(button);
    container.appendChild(rightSide);
    return container;
  }
}
