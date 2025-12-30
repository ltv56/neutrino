import { useState } from 'react';
import { noteService } from '@/services';
import { useToast } from '@/contexts/ToastContext';
import { useSessionsContext } from '@/hooks';

// Comprehensive markdown test content with all syntax
const MARKDOWN_TEST_CONTENT = `# Markdown Syntax Test

This note demonstrates **all markdown features** supported by the editor.

## Text Formatting

**Bold text** and *italic text* can be combined as ***bold italic***.

You can also use __underscores__ for **bold** and _single underscore_ for *italic*.

~~Strikethrough text~~ is also supported.

## Lists

### Unordered Lists

- First item
- Second item
  - Nested item 1
  - Nested item 2
    - Deeply nested item
- Third item

### Ordered Lists

1. First step
2. Second step
   1. Sub-step A
   2. Sub-step B
3. Third step

### Task Lists

- [x] Completed task
- [ ] Pending task
- [ ] Another pending task

## Code

Inline code: \`const variable = "value";\`

### Code Blocks

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // Output: 55
\`\`\`

\`\`\`python
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)

print(quick_sort([3, 6, 8, 10, 1, 2, 1]))
\`\`\`

## Blockquotes

> This is a blockquote.
> It can span multiple lines.
>
> > Nested blockquotes are also possible.
> > They use multiple \`>\` characters.

> **Note:** Blockquotes can contain **formatted text** and other elements.

## Links and References

[Visit OpenAI](https://openai.com)

[Link with title](https://github.com "GitHub Homepage")

Auto-link: https://www.example.com

## Tables

| Feature | Supported | Notes |
|---------|-----------|-------|
| Bold | ✅ | \`**text**\` |
| Italic | ✅ | \`*text*\` |
| Code | ✅ | \`\\\`code\\\`\` |
| Tables | ✅ | GFM syntax |
| Task Lists | ✅ | \`- [ ] task\` |

| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Left | Center | Right |
| A | B | C |

## Horizontal Rules

Three ways to create horizontal rules:

---

***

___

## Images

![Alt text](https://via.placeholder.com/150 "Image title")

## Emphasis and Strong Emphasis

*This is emphasized text*

**This is strong text**

***This is both***

## Escaping Characters

You can escape special characters: \\* \\_ \\[ \\]

## Mathematical Notation (if supported)

Inline math: $E = mc^2$

Block math:

$$
\\int_{a}^{b} f(x) dx = F(b) - F(a)
$$

## Footnotes

Here's a sentence with a footnote[^1].

[^1]: This is the footnote content.

## Definition Lists

Term 1
: Definition 1

Term 2
: Definition 2a
: Definition 2b

## HTML Elements (if allowed)

<kbd>Ctrl</kbd> + <kbd>C</kbd>

<mark>Highlighted text</mark>

<details>
<summary>Click to expand</summary>

Hidden content goes here.

</details>

## Complex Nested Structures

1. First level ordered
   - Second level unordered
     1. Third level ordered
        - Fourth level unordered
          > Fifth level blockquote
          > with multiple lines

## Special Cases

### Empty Lines

This paragraph has...


...multiple empty lines above it.

### Long Lines

This is a very long line that should wrap properly in the editor without breaking the layout or causing horizontal scroll bars to appear which would be a poor user experience and should be handled gracefully by the markdown renderer.

---

## Wiki Links

Test wiki-style links: [[Another Note]] and [[Notes/Nested Note]].

## Summary

This document tests:
- ✅ All heading levels (H1-H6)
- ✅ Text formatting (bold, italic, strikethrough)
- ✅ Lists (ordered, unordered, task lists)
- ✅ Code (inline and blocks with syntax highlighting)
- ✅ Blockquotes (including nested)
- ✅ Links and auto-links
- ✅ Tables with alignment
- ✅ Horizontal rules
- ✅ Images
- ✅ Special characters and escaping
- ✅ Complex nested structures

**All markdown syntax features are demonstrated above!**
`;

const NoteTest = () => {
  const toast = useToast();
  const { currentSession } = useSessionsContext();
  const [loading, setLoading] = useState(false);
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(null);

  const handleCreateMarkdownTest = async () => {
    setLoading(true);
    try {
      const note = await noteService.create(
        currentSession?.id || null, // use current session if available
        null, // no document
        null, // no folder
        'Markdown Syntax Test',
        MARKDOWN_TEST_CONTENT,
        'concept'
      );

      setCreatedNoteId(note.id);
      toast.success(`Created test note: ${note.id.substring(0, 8)}...`);

      // Dispatch event to refresh notes list
      window.dispatchEvent(new CustomEvent('note-created', {
        detail: { noteId: note.id }
      }));
    } catch (error) {
      console.error('Failed to create markdown test:', error);
      toast.error('Failed to create test note');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSimpleNote = async () => {
    setLoading(true);
    try {
      const note = await noteService.create(
        currentSession?.id || null,
        null,
        null, // no folder
        'Simple Test Note',
        '# Simple Note\n\nThis is a **simple** test note with minimal content.\n\n- Item 1\n- Item 2\n- Item 3',
        'concept'
      );

      setCreatedNoteId(note.id);
      toast.success(`Created simple note: ${note.id.substring(0, 8)}...`);

      window.dispatchEvent(new CustomEvent('note-created', {
        detail: { noteId: note.id }
      }));
    } catch (error) {
      console.error('Failed to create simple note:', error);
      toast.error('Failed to create simple note');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmptyNote = async () => {
    setLoading(true);
    try {
      const note = await noteService.create(
        currentSession?.id || null,
        null,
        null, // no folder
        'Empty Note Test',
        '',
        'concept'
      );

      setCreatedNoteId(note.id);
      toast.success(`Created empty note: ${note.id.substring(0, 8)}...`);

      window.dispatchEvent(new CustomEvent('note-created', {
        detail: { noteId: note.id }
      }));
    } catch (error) {
      console.error('Failed to create empty note:', error);
      toast.error('Failed to create empty note');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!createdNoteId) {
      toast.error('Create a note first!');
      return;
    }

    setLoading(true);
    try {
      await noteService.update(
        createdNoteId,
        'Updated Test Note',
        '# Updated Content\n\nThis note has been **updated** via debug tools.\n\nTimestamp: ' + new Date().toISOString()
      );

      toast.success('Note updated successfully');

      // Dispatch event to refresh
      window.dispatchEvent(new CustomEvent('note-title-changed', {
        detail: { noteId: createdNoteId, title: 'Updated Test Note' }
      }));
    } catch (error) {
      console.error('Failed to update note:', error);
      toast.error('Failed to update note');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!createdNoteId) {
      toast.error('Create a note first!');
      return;
    }

    setLoading(true);
    try {
      await noteService.delete(createdNoteId);
      toast.success('Note deleted successfully');
      setCreatedNoteId(null);

      // Refresh notes list
      window.dispatchEvent(new Event('notes-changed'));
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast.error('Failed to delete note');
    } finally {
      setLoading(false);
    }
  };

  const handleGetAllNotes = async () => {
    setLoading(true);
    try {
      const notes = await noteService.getAll();
      console.log('📝 All notes:', notes);
      toast.success(`Found ${notes.length} notes (check console)`);
    } catch (error) {
      console.error('Failed to get notes:', error);
      toast.error('Failed to get notes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        Test note creation, updates, and markdown rendering
      </div>

      {/* Current Session Info */}
      {currentSession ? (
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
          <span className="font-medium text-blue-900 dark:text-blue-100">Session: </span>
          <span className="text-blue-700 dark:text-blue-300">{currentSession.title}</span>
        </div>
      ) : (
        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-300">
          ⚠️ No session selected - notes will be created without session
        </div>
      )}

      {/* Create Section */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Create Test Notes</h4>

        <button
          onClick={handleCreateMarkdownTest}
          disabled={loading}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm transition-colors"
        >
          {loading ? '⏳ Creating...' : '📝 Create Full Markdown Test'}
        </button>

        <button
          onClick={handleCreateSimpleNote}
          disabled={loading}
          className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm transition-colors"
        >
          {loading ? '⏳ Creating...' : '✏️ Create Simple Note'}
        </button>

        <button
          onClick={handleCreateEmptyNote}
          disabled={loading}
          className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm transition-colors"
        >
          {loading ? '⏳ Creating...' : '📄 Create Empty Note'}
        </button>
      </div>

      {/* Operations Section */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Note Operations</h4>

        <button
          onClick={handleUpdateNote}
          disabled={loading || !createdNoteId}
          className="w-full px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm transition-colors"
        >
          {loading ? '⏳ Updating...' : '✏️ Update Last Note'}
        </button>

        <button
          onClick={handleDeleteNote}
          disabled={loading || !createdNoteId}
          className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm transition-colors"
        >
          {loading ? '⏳ Deleting...' : '🗑️ Delete Last Note'}
        </button>

        <button
          onClick={handleGetAllNotes}
          disabled={loading}
          className="w-full px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm transition-colors"
        >
          {loading ? '⏳ Loading...' : '📋 Get All Notes (Console)'}
        </button>
      </div>

      {/* Status */}
      {createdNoteId && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
          <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">Last Created Note:</div>
          <div className="font-mono text-blue-700 dark:text-blue-300 break-all">
            {createdNoteId}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded text-xs text-gray-600 dark:text-gray-400">
        <strong>💡 Tips:</strong>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Full markdown test includes ALL syntax</li>
          <li>Check console for detailed logs</li>
          <li>Notes appear in sidebar automatically</li>
          <li>Test auto-save by editing created notes</li>
        </ul>
      </div>
    </div>
  );
};

export default NoteTest;
