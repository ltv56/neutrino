import { WidgetType } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';

export class CheckboxWidget extends WidgetType {
  checked: boolean;
  pos: number;
  view: EditorView;

  constructor(checked: boolean, pos: number, view: EditorView) {
    super();
    this.checked = checked;
    this.pos = pos;
    this.view = view;
  }

  toDOM() {
    const wrap = document.createElement('span');
    wrap.className = 'cm-task-checkbox';

    const checkbox = document.createElement('div');
    checkbox.className = 'cm-task-checkbox-input';

    if (this.checked) {
      checkbox.classList.add('checked');

      // Add Lucide Check icon SVG
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('width', '12');
      icon.setAttribute('height', '12');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('fill', 'none');
      icon.setAttribute('stroke', 'currentColor');
      icon.setAttribute('stroke-width', '3');
      icon.setAttribute('stroke-linecap', 'round');
      icon.setAttribute('stroke-linejoin', 'round');
      icon.classList.add('cm-task-checkbox-icon');

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      path.setAttribute('points', '20 6 9 17 4 12');

      icon.appendChild(path);
      checkbox.appendChild(icon);
    }

    checkbox.onclick = (e) => {
      e.preventDefault();
      const line = this.view.state.doc.lineAt(this.pos);
      const lineText = line.text;
      const newText = this.checked
        ? lineText.replace(/- \[x\]/i, '- [ ]')
        : lineText.replace(/- \[ \]/, '- [x]');

      this.view.dispatch({
        changes: { from: line.from, to: line.to, insert: newText }
      });
    };

    wrap.appendChild(checkbox);
    return wrap;
  }
}
