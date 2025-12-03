import type { Language } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { rust } from '@codemirror/lang-rust';
import { sql } from '@codemirror/lang-sql';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { php } from '@codemirror/lang-php';
import { go } from '@codemirror/lang-go';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { xml } from '@codemirror/lang-xml';

export const getLanguageSupport = (info: string): Language | null => {
  const lower = info.toLowerCase();

  // JavaScript/TypeScript
  if (lower === 'javascript' || lower === 'js') return javascript().language;
  if (lower === 'typescript' || lower === 'ts') return javascript({ typescript: true }).language;
  if (lower === 'jsx') return javascript({ jsx: true }).language;
  if (lower === 'tsx') return javascript({ jsx: true, typescript: true }).language;

  // Python
  if (lower === 'python' || lower === 'py') return python().language;

  // Java
  if (lower === 'java') return java().language;

  // C/C++
  if (lower === 'c' || lower === 'cpp' || lower === 'c++' || lower === 'cxx') return cpp().language;

  // Rust
  if (lower === 'rust' || lower === 'rs') return rust().language;

  // Go
  if (lower === 'go' || lower === 'golang') return go().language;

  // PHP
  if (lower === 'php') return php().language;

  // HTML
  if (lower === 'html' || lower === 'htm') return html().language;

  // CSS
  if (lower === 'css') return css().language;

  // XML
  if (lower === 'xml') return xml().language;

  // SQL
  if (lower === 'sql') return sql().language;

  // JSON
  if (lower === 'json') return json().language;

  // YAML
  if (lower === 'yaml' || lower === 'yml') return yaml().language;

  return null;
};
