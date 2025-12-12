import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkWikiLink from '@/utils/remarkWikiLink';
import { Book, Edit, AlertCircle, X } from 'lucide-react';
import { noteService, documentService, type Note } from '@/services';
import { tabPositionTracker } from '@/services/tabPositionTracker';
import { useToast } from '@/contexts/ToastContext';
import Tooltip from '@/components/common/Tooltip';
import NoteAutocomplete from './NoteAutocomplete';
import './markdown.css';

interface NoteEditorProps {
  noteId?: string;
  tabId?: string;
  sessionId?: string;
  documentId?: string;
  onClose: () => void;
  onSave?: (noteId: string) => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  noteId,
  tabId,
  sessionId,
  documentId,
  onClose,
  onSave,
}) => {
  const toast = useToast();
  const [mode, setMode] = useState<'reading' | 'edit'>('edit');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState<string | undefined>(noteId);
  const [lastSavedTitle, setLastSavedTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [errorTitleRef, setErrorTitleRef] = useState<string | null>(null);
  const [invalidCharWarning, setInvalidCharWarning] = useState<string | null>(null);

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [autocompletePrefix, setAutocompletePrefix] = useState<'' | 'doc:' | 'note:'>(''); // Track prefix type
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [allDocuments, setAllDocuments] = useState<Array<{ id: string; title: string }>>([]);

  // Refs
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasAutoFocusedRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadNote = useCallback(async () => {
    if (!noteId) return;

    setIsLoading(true);
    try {
      const note = await noteService.getById(noteId);
      if (note) {
        setTitle(note.title);
        setContent(note.content);
        setCurrentNoteId(note.id);
        setLastSavedTitle(note.title);

        // Clear warnings when loading note from DB
        // DB value is always valid (no special chars)
        setInvalidCharWarning(null);
        setTitleError(null);
        setErrorTitleRef(null);
      }
    } catch (err) {
      console.error('Failed to load note:', err);
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  // Load note on mount
  useEffect(() => {
    if (noteId) {
      loadNote();
    }
  }, [noteId, loadNote]);

  // Load all notes and documents for autocomplete
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [notes, docs] = await Promise.all([
          noteService.getAll(),
          documentService.getAll()
        ]);
        setAllNotes(notes);
        setAllDocuments(docs);
      } catch (err) {
        console.error('Failed to load notes/documents for autocomplete:', err);
      }
    };

    fetchAll();
  }, []);

  // Auto-focus and select title after loading (only once)
  useEffect(() => {
    if (!isLoading && title && title.startsWith('Untitled') && !hasAutoFocusedRef.current) {
      hasAutoFocusedRef.current = true;
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
          titleInputRef.current.select();
        }
      }, 100);
    }
  }, [isLoading, title]);

  // Auto-save with debounce
  const autoSave = useCallback(async (newTitle: string, newContent: string, titleChanged: boolean) => {
    // Check for invalid characters in title directly (don't rely on state)
    const invalidCharsPattern = /[/\\:*?"<>|]/;
    const hasInvalidChars = invalidCharsPattern.test(newTitle);

    // Don't save if there's a title error or invalid characters
    if ((titleError || hasInvalidChars) && titleChanged) {
      return;
    }

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce 500ms for title, 1s for content
    const debounceTime = titleChanged ? 500 : 1000;
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (currentNoteId) {
          // Update existing note
          await noteService.update(currentNoteId, newTitle, newContent);

          // Clear error on successful save
          if (titleError) {
            setTitleError(null);
            setErrorTitleRef(null);
          }

          // Update lastSavedTitle and dispatch events if title changed
          if (titleChanged && newTitle !== lastSavedTitle) {
            setLastSavedTitle(newTitle);

            // Update tab title and sidebar
            window.dispatchEvent(new CustomEvent('note-title-changed', {
              detail: { noteId: currentNoteId, title: newTitle }
            }));
          }

          // Dispatch note-saved event for context snapshot tracking
          window.dispatchEvent(new CustomEvent('note-saved', {
            detail: { noteId: currentNoteId, title: newTitle }
          }));
        } else {
          // Create new note
          // Don't save if both title and content are empty/whitespace
          if (!newTitle.trim() && !newContent.trim()) return;

          // Don't save if title is empty (even if content exists)
          // User must provide a title to create a note
          if (!newTitle.trim()) return;

          const newNote = await noteService.create(
            sessionId || null,
            documentId || null,
            newTitle || 'Untitled',
            newContent,
            'concept'
          );
          setCurrentNoteId(newNote.id);
          setLastSavedTitle(newTitle);
          onSave?.(newNote.id);

          // Clear error on successful save
          if (titleError) {
            setTitleError(null);
            setErrorTitleRef(null);
          }

          // Notify sidebar to select the new note
          window.dispatchEvent(new CustomEvent('note-created', {
            detail: { noteId: newNote.id }
          }));
          // Update tab title for newly created note
          window.dispatchEvent(new CustomEvent('note-title-changed', {
            detail: { noteId: newNote.id, title: newTitle }
          }));
          // Dispatch note-saved event for context snapshot tracking
          window.dispatchEvent(new CustomEvent('note-saved', {
            detail: { noteId: newNote.id, title: newTitle }
          }));
        }
      } catch (err) {
        console.error('[AutoSave] Failed:', err);

        // Detailed error logging
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorStack = err instanceof Error ? err.stack : undefined;

        console.error('[AutoSave] Error details:', {
          error: errorMessage,
          stack: errorStack,
          noteId: currentNoteId,
          titleLength: newTitle.length,
          contentLength: newContent.length,
          titlePreview: newTitle.substring(0, 50),
          contentPreview: newContent.substring(0, 100),
          errorType: err?.constructor?.name,
          fullError: err,
        });

        // Check error types
        if (errorMessage.includes('UNIQUE constraint') || errorMessage.includes('duplicate')) {
          setTitleError(`A note with the title "${newTitle}" already exists in this session`);
          setErrorTitleRef(newTitle);
        } else if (errorMessage.includes('malformed') || errorMessage.includes('corrupt')) {
          console.error('[AutoSave] DATABASE CORRUPTION DETECTED!');
          console.error('[AutoSave] Content that caused error:', {
            title: newTitle,
            content: newContent,
            titleHex: Array.from(newTitle).map(c => c.charCodeAt(0).toString(16)).join(' '),
            contentHex: Array.from(newContent.substring(0, 100)).map(c => c.charCodeAt(0).toString(16)).join(' '),
          });
          toast.error('Database error - please check console for details');
        } else {
          toast.error(`Failed to save note: ${errorMessage}`);
        }
      }
    }, debounceTime);
  }, [currentNoteId, sessionId, documentId, onSave, lastSavedTitle, toast, titleError]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newTitle = e.target.value;

    // Trim leading spaces only (like file explorer)
    newTitle = newTitle.replace(/^\s+/, '');

    setTitle(newTitle);

    // Check for invalid filename characters: / \ : * ? " < > |
    const invalidChars = /[/\\:*?"<>|]/;
    if (invalidChars.test(newTitle)) {
      // Show persistent warning (like duplicate title error)
      setInvalidCharWarning('Invalid characters: / \\ : * ? " < > |');
    } else {
      // Clear warning when no invalid characters
      setInvalidCharWarning(null);
    }

    // Auto-clear duplicate error if user changes to a different title
    if (errorTitleRef && newTitle !== errorTitleRef) {
      setTitleError(null);
      setErrorTitleRef(null);
    }

    // Auto-save immediately while typing (will skip if invalid characters present)
    autoSave(newTitle, content, true);
  };

  const handleTitleBlur = () => {
    // Check for invalid characters in title directly (don't rely on state)
    const invalidCharsPattern = /[/\\:*?"<>|]/;
    const hasInvalidChars = invalidCharsPattern.test(title);

    // Update sidebar and tabbar when blur
    // Don't update if there's an error or invalid characters
    if (currentNoteId && title !== lastSavedTitle && !titleError && !hasInvalidChars) {
      // Update tab title and sidebar with optimistic update
      window.dispatchEvent(new CustomEvent('note-title-changed', {
        detail: { noteId: currentNoteId, title: title }
      }));
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursorPosition = e.target.selectionStart;

    setContent(newContent);
    autoSave(title, newContent, false); // Content changed, title same

    // Check for [[ trigger
    const textBeforeCursor = newContent.substring(0, cursorPosition);
    const lastDoubleBracket = textBeforeCursor.lastIndexOf('[[');

    if (lastDoubleBracket !== -1) {
      // Check if there's a closing ]] after the [[
      const textAfterBracket = textBeforeCursor.substring(lastDoubleBracket);
      const hasClosingBracket = textAfterBracket.includes(']]');

      if (!hasClosingBracket) {
        // Extract text after [[
        const textAfterBrackets = textBeforeCursor.substring(lastDoubleBracket + 2);

        // Detect prefix (doc: or note:)
        let prefix: '' | 'doc:' | 'note:' = '';
        let query = textAfterBrackets;

        if (textAfterBrackets.startsWith('doc:')) {
          prefix = 'doc:';
          query = textAfterBrackets.substring(4);
        } else if (textAfterBrackets.startsWith('note:')) {
          prefix = 'note:';
          query = textAfterBrackets.substring(5);
        }

        // Calculate dropdown position near [[
        if (contentTextareaRef.current) {
          const textarea = contentTextareaRef.current;
          const textareaRect = textarea.getBoundingClientRect();
          const style = getComputedStyle(textarea);

          // Get computed styles
          const lineHeight = parseFloat(style.lineHeight) || 24;
          const fontSize = parseFloat(style.fontSize) || 14;
          const paddingLeft = parseFloat(style.paddingLeft) || 0;

          // Calculate line number
          const lines = textBeforeCursor.split('\n');
          const currentLineIndex = lines.length - 1;
          const currentLineText = lines[currentLineIndex];

          // Find position of [[ in current line
          const bracketPos = currentLineText.indexOf('[[');
          const textUpToBracket = currentLineText.substring(0, bracketPos + 2); // Include [[

          // Create invisible element to measure text width accurately
          const measureDiv = document.createElement('div');
          measureDiv.style.position = 'absolute';
          measureDiv.style.visibility = 'hidden';
          measureDiv.style.whiteSpace = 'pre';
          measureDiv.style.font = style.font;
          measureDiv.style.fontSize = style.fontSize;
          measureDiv.style.fontFamily = style.fontFamily;
          measureDiv.textContent = textUpToBracket;
          document.body.appendChild(measureDiv);
          const textWidth = measureDiv.offsetWidth;
          document.body.removeChild(measureDiv);

          // Position dropdown below current line, after [[
          // Note: Using position:fixed in NoteAutocomplete, so no need for window.scrollY/X
          const top = textareaRect.top + (currentLineIndex * lineHeight) - textarea.scrollTop + lineHeight + 4;
          const left = textareaRect.left + paddingLeft + textWidth;

          setAutocompletePosition({
            top,
            left,
          });
          setAutocompleteQuery(query);
          setAutocompletePrefix(prefix);
          setSelectedAutocompleteIndex(0);
          setShowAutocomplete(true);
        }
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  };

  // Custom link component for handling wiki links
  const NoteLinkComponent = ({ href, children, ...props }: React.ComponentProps<'a'>) => {
    // ReactMarkdown v10+ passes href in node.properties
    const node = (props as { node?: { properties?: { href?: string } } }).node;
    const actualHref = href || node?.properties?.href || '';

    // For wikilinks in auto mode, check if it resolves to a note and add .md
    // (allNotes and allDocuments are available from parent scope)
    let displayText: React.ReactNode = children;
    if (href?.startsWith('wikilink://')) {
      const urlParts = href.replace('wikilink://', '').split('?');
      const targetTitle = decodeURIComponent(urlParts[0]);

      // Check if target is a note (synchronously, using already-loaded data)
      const isNote = allNotes.some(n => n.title === targetTitle);
      if (isNote) {
        displayText = `${targetTitle}.md`;
      }
      // If it's a document, title already includes .pdf from database
    }

    const handleClick = async (e: React.MouseEvent) => {
      // ALWAYS prevent default first to avoid page reload
      e.preventDefault();
      e.stopPropagation();

      if (!href) {
        return;
      }

      // Check protocol
      const isWikiLink = href.startsWith('wikilink://');
      const isDocLink = href.startsWith('document://');
      const isNoteLink = href.startsWith('note://');

      if (!isWikiLink && !isDocLink && !isNoteLink) {
        return;
      }

      try {
        let targetTitle = '';
        let pageNumber = 1;

        if (isWikiLink) {
          // Auto search: notes first, then documents
          // Parse URL: wikilink://Title?page=5
          const urlParts = href.replace('wikilink://', '').split('?');
          targetTitle = decodeURIComponent(urlParts[0]);

          // Parse page number
          if (urlParts[1]) {
            const pageMatch = urlParts[1].match(/page=(\d+)/);
            if (pageMatch) {
              pageNumber = parseInt(pageMatch[1]);
            }
          }

          // Try to find note first
          const allNotes = await noteService.getAll();
          const targetNote = allNotes.find(n => n.title === targetTitle);

          if (targetNote) {
            window.dispatchEvent(new CustomEvent('open-note-split-view', {
              detail: { noteId: targetNote.id, title: targetNote.title }
            }));
            return;
          }

          // If note not found, try document
          const allDocs = await documentService.getAll();
          const targetDoc = allDocs.find(d => d.title === targetTitle);

          if (targetDoc) {
            window.dispatchEvent(new CustomEvent('open-document-split-view', {
              detail: { documentId: targetDoc.id, title: targetDoc.title, page: pageNumber }
            }));
            return;
          }

          toast.error(`"${targetTitle}" not found in notes or documents`);

        } else if (isDocLink) {
          // Document only
          // Parse URL: document://Title?page=3
          const urlParts = href.replace('document://', '').split('?');
          targetTitle = decodeURIComponent(urlParts[0]);

          // Parse page number
          if (urlParts[1]) {
            const pageMatch = urlParts[1].match(/page=(\d+)/);
            if (pageMatch) {
              pageNumber = parseInt(pageMatch[1]);
            }
          }

          const allDocs = await documentService.getAll();
          const targetDoc = allDocs.find(d => d.title === targetTitle);

          if (targetDoc) {
            window.dispatchEvent(new CustomEvent('open-document-split-view', {
              detail: { documentId: targetDoc.id, title: targetDoc.title, page: pageNumber }
            }));
          } else {
            toast.error(`Document "${targetTitle}" not found`);
          }

        } else if (isNoteLink) {
          // Note only
          targetTitle = decodeURIComponent(href.replace('note://', ''));

          const allNotes = await noteService.getAll();
          const targetNote = allNotes.find(n => n.title === targetTitle);

          if (targetNote) {
            window.dispatchEvent(new CustomEvent('open-note-split-view', {
              detail: { noteId: targetNote.id, title: targetNote.title }
            }));
          } else {
            toast.error(`Note "${targetTitle}" not found`);
          }
        }
      } catch (err) {
        console.error('[NoteLinkComponent] Error:', err);
        toast.error('Failed to open link');
      }
    };

    // Style wiki links differently
    const isWikiLink = href?.startsWith('wikilink://') || href?.startsWith('document://') || href?.startsWith('note://');

    return (
      <a
        {...props}
        href={href}
        onClick={handleClick}
        className={isWikiLink ? 'wiki-link' : props.className}
        style={isWikiLink ? {
          color: 'var(--accent)',
          textDecoration: 'none',
          cursor: 'pointer',
          fontWeight: 500,
        } : props.style}
      >
        {displayText}
      </a>
    );
  };

  // Handle autocomplete item selection
  const handleAutocompleteSelect = useCallback((item: Note | { id: string; title: string }, itemType: 'note' | 'document') => {
    if (!contentTextareaRef.current) return;

    const textarea = contentTextareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPosition);
    const lastDoubleBracket = textBeforeCursor.lastIndexOf('[[');

    if (lastDoubleBracket !== -1) {
      // Build the link text based on prefix
      let linkText = '';
      if (autocompletePrefix === 'doc:') {
        linkText = `doc:${item.title}`;
      } else if (autocompletePrefix === 'note:') {
        linkText = `note:${item.title}`;
      } else {
        // Auto mode: add .md for notes (will be stripped by remarkWikiLink when parsing)
        if (itemType === 'note') {
          linkText = `${item.title}.md`;
        } else {
          linkText = item.title; // PDF already has .pdf
        }
      }

      // Replace [[prefix:query with [[prefix:Title (no auto-close ]] to allow adding #page)
      const before = content.substring(0, lastDoubleBracket);
      const after = content.substring(cursorPosition);
      const newContent = `${before}[[${linkText}${after}`;

      setContent(newContent);
      setShowAutocomplete(false);
      autoSave(title, newContent, false);

      // Set cursor after the inserted title (before any remaining text)
      setTimeout(() => {
        const newCursorPos = lastDoubleBracket + 2 + linkText.length; // +2 for [[
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    }
  }, [content, title, autoSave, autocompletePrefix]);

  // Get filtered items based on prefix and query
  const getFilteredItems = useCallback(() => {
    let items: Array<{ item: Note | { id: string; title: string }; type: 'note' | 'document' }> = [];

    if (autocompletePrefix === 'doc:') {
      // Only documents (exclude current document if exists)
      items = allDocuments
        .filter(doc =>
          doc.title.toLowerCase().includes(autocompleteQuery.toLowerCase()) &&
          doc.id !== documentId // Exclude current document
        )
        .map(doc => ({ item: doc, type: 'document' as const }));
    } else if (autocompletePrefix === 'note:') {
      // Only notes (exclude current note)
      items = allNotes
        .filter(note =>
          note.title.toLowerCase().includes(autocompleteQuery.toLowerCase()) &&
          note.id !== currentNoteId // Exclude current note
        )
        .map(note => ({ item: note, type: 'note' as const }));
    } else {
      // Auto mode: notes first, then documents (exclude current)
      const filteredNotes = allNotes
        .filter(note =>
          note.title.toLowerCase().includes(autocompleteQuery.toLowerCase()) &&
          note.id !== currentNoteId // Exclude current note
        )
        .map(note => ({ item: note, type: 'note' as const }));

      const filteredDocs = allDocuments
        .filter(doc =>
          doc.title.toLowerCase().includes(autocompleteQuery.toLowerCase()) &&
          doc.id !== documentId // Exclude current document
        )
        .map(doc => ({ item: doc, type: 'document' as const }));

      items = [...filteredNotes, ...filteredDocs];
    }

    return items.slice(0, 10); // Limit to 10 items
  }, [allNotes, allDocuments, autocompleteQuery, autocompletePrefix, currentNoteId, documentId]);

  // Handle keyboard navigation in autocomplete
  const handleContentKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showAutocomplete) return;

    const filteredItems = getFilteredItems();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedAutocompleteIndex(prev =>
        prev < filteredItems.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedAutocompleteIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedAutocompleteIndex]) {
        const { item, type } = filteredItems[selectedAutocompleteIndex];
        handleAutocompleteSelect(item, type);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowAutocomplete(false);
    }
  }, [showAutocomplete, selectedAutocompleteIndex, handleAutocompleteSelect, getFilteredItems]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xs text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-end gap-2 px-3 py-1.5 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>Auto-saved</span>

        <Tooltip content={mode === 'edit' ? 'Reading Mode' : 'Edit Mode'} placement="bottom-right">
          <button
            onClick={() => setMode(mode === 'edit' ? 'reading' : 'edit')}
            className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
            style={{ color: 'var(--fg-secondary)' }}
          >
            {mode === 'edit' ? <Book size={14} /> : <Edit size={14} />}
          </button>
        </Tooltip>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex justify-center px-4">
        {mode === 'edit' ? (
          <div ref={scrollContainerRef} className="h-full flex flex-col overflow-y-auto w-full" style={{ maxWidth: '800px' }}>
            {/* Title input */}
            <div className="px-8 pt-12 pb-4 relative">
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                placeholder="Untitled"
                className="text-xl font-semibold outline-none border-none w-full"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--fg-primary)',
                  lineHeight: '1.3',
                  margin: 0,
                  padding: 0,
                }}
              />

              {/* Floating error tooltip */}
              {titleError && (
                <div
                  className="absolute rounded z-50 flex items-center gap-2"
                  style={{
                    right: '160px',
                    top: 'calc(50% + 2px)',
                    backgroundColor: 'var(--danger)',
                    padding: '6px 10px',
                    maxWidth: '500px',
                  }}
                >
                  {/* Error Icon */}
                  <AlertCircle
                    size={14}
                    style={{
                      color: 'white',
                      flexShrink: 0
                    }}
                  />

                  {/* Error Message */}
                  <p
                    className="text-xs"
                    style={{
                      color: 'white',
                      fontWeight: 500,
                      lineHeight: '1.4',
                      margin: 0
                    }}
                  >
                    {titleError}
                  </p>
                </div>
              )}

              {/* Floating warning tooltip for invalid characters */}
              {invalidCharWarning && (
                <div
                  className="absolute rounded z-50 flex items-center gap-2"
                  style={{
                    right: '160px',
                    top: 'calc(50% + 2px)',
                    backgroundColor: 'var(--warning)',
                    padding: '6px 10px',
                    maxWidth: '500px',
                  }}
                >
                  {/* Warning Icon */}
                  <AlertCircle
                    size={14}
                    style={{
                      color: 'white',
                      flexShrink: 0
                    }}
                  />

                  {/* Warning Message */}
                  <p
                    className="text-xs"
                    style={{
                      color: 'white',
                      fontWeight: 500,
                      lineHeight: '1.4',
                      margin: 0
                    }}
                  >
                    {invalidCharWarning}
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="h-px mt-3" style={{ backgroundColor: 'var(--border)' }} />
            </div>

            {/* Content textarea */}
            <textarea
              ref={contentTextareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleContentKeyDown}
              placeholder="Start writing..."
              className="flex-1 px-8 pb-8 resize-none outline-none border-none text-sm"
              style={{
                color: 'var(--fg-primary)',
                lineHeight: '1.7',
              }}
            />

            {/* Autocomplete dropdown */}
            {showAutocomplete && (
              <NoteAutocomplete
                items={getFilteredItems()}
                position={autocompletePosition}
                selectedIndex={selectedAutocompleteIndex}
                onSelect={handleAutocompleteSelect}
                onClose={() => setShowAutocomplete(false)}
              />
            )}
          </div>
        ) : (
          <div ref={scrollContainerRef} className="h-full flex flex-col overflow-y-auto w-full" style={{ maxWidth: '800px' }}>
            {/* Title preview */}
            <div className="px-8 pt-12 pb-4">
              <h1
                className="text-xl font-semibold"
                style={{
                  color: 'var(--fg-primary)',
                  lineHeight: '1.3',
                  margin: 0,
                  padding: 0,
                }}
              >
                {title || 'Untitled'}
              </h1>
              {/* Divider */}
              <div className="h-px mt-3" style={{ backgroundColor: 'var(--border)' }} />
            </div>

            {/* Content preview */}
            <div className="flex-1 px-8 pb-8">
              {content ? (
                <div className="markdown-preview prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkWikiLink]}
                    urlTransform={(url) => {
                      // Allow custom protocols: wikilink://, document://, note://
                      if (url.startsWith('wikilink://') || url.startsWith('document://') || url.startsWith('note://')) {
                        return url; // Keep custom protocols as-is
                      }
                      // For all other URLs, use default behavior (allows http, https, mailto, etc.)
                      return url;
                    }}
                    components={{
                      a: NoteLinkComponent,
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--fg-tertiary)' }}>
                  No content yet.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteEditor;
