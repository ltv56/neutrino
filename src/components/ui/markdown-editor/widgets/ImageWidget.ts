import { WidgetType } from '@codemirror/view';

export class ImageWidget extends WidgetType {
  alt: string;
  src: string;

  constructor(alt: string, src: string) {
    super();
    this.alt = alt;
    this.src = src;
  }

  toDOM() {
    const wrap = document.createElement('span');
    wrap.className = 'cm-image-widget';
    wrap.style.cssText = 'display: inline-block; max-width: 100%; margin: 0.5em 0;';

    const img = document.createElement('img');
    img.src = this.src;
    img.alt = this.alt;
    img.className = 'cm-image';
    img.style.cssText = 'max-width: 100%; height: auto; border-radius: 4px; display: block;';

    // Handle load errors - show nice placeholder with Lucide ImageOff icon
    img.onerror = () => {
      wrap.innerHTML = '';

      const placeholder = document.createElement('div');
      placeholder.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75em;
        padding: 2em;
        background: rgba(135, 131, 120, 0.1);
        border: 1px dashed rgba(135, 131, 120, 0.3);
        border-radius: 4px;
        color: var(--text-secondary);
        font-size: 14px;
      `;

      // Lucide ImageOff icon SVG
      const iconWrapper = document.createElement('div');
      iconWrapper.style.cssText = 'flex-shrink: 0; opacity: 0.5;';
      iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/><line x1="13.5" x2="6" y1="13.5" y2="21"/><line x1="18" x2="21" y1="12" y2="15"/><path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"/><path d="M21 15V5a2 2 0 0 0-2-2H9"/></svg>`;

      const textContainer = document.createElement('div');
      textContainer.style.cssText = 'display: flex; flex-direction: column; gap: 0.25em;';

      const title = document.createElement('div');
      title.textContent = 'Image failed to load';
      title.style.cssText = 'font-weight: 500;';

      const subtitle = document.createElement('div');
      subtitle.textContent = this.alt || 'No alt text provided';
      subtitle.style.cssText = 'font-size: 12px; opacity: 0.7;';

      textContainer.appendChild(title);
      textContainer.appendChild(subtitle);

      placeholder.appendChild(iconWrapper);
      placeholder.appendChild(textContainer);
      wrap.appendChild(placeholder);
    };

    wrap.appendChild(img);
    return wrap;
  }

  eq(other: ImageWidget) {
    return other.src === this.src && other.alt === this.alt;
  }
}
