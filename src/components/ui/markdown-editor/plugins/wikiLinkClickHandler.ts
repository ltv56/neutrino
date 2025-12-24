import { EditorView } from '@codemirror/view';
import { noteService } from '@/services';

/**
 * Extension to handle Ctrl+Click on wiki links [[...]]
 * Single click: normal editing behavior (places cursor in link)
 * Ctrl+Click (Cmd+Click on Mac): opens the linked note in split view
 */
export const wikiLinkClickHandler = EditorView.domEventHandlers({
    click: (event: MouseEvent, view: EditorView) => {
        // Only handle Ctrl+Click (Windows/Linux) or Cmd+Click (Mac)
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modifierPressed = isMac ? event.metaKey : event.ctrlKey;

        if (!modifierPressed) {
            return false; // No modifier key, let normal click behavior happen
        }

        // Get clicked position
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos === null) {
            console.log('[WikiLink] Could not get position from click');
            return false;
        }

        const line = view.state.doc.lineAt(pos);
        const lineText = line.text;
        console.log('[WikiLink] Ctrl+Click at pos:', pos, 'line:', lineText);

        // Find wiki links in this line
        const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
        let match;

        while ((match = wikiLinkRegex.exec(lineText)) !== null) {
            const matchStart = line.from + match.index;
            const matchEnd = matchStart + match[0].length;

            console.log('[WikiLink] Checking match:', match[0], 'range:', matchStart, '-', matchEnd, 'pos:', pos);

            // Check if clicked position is within this wiki link
            if (pos >= matchStart && pos <= matchEnd) {
                const linkText = match[1];
                console.log('[WikiLink] ✅ Match found! Link text:', linkText);

                // Prevent default click behavior
                event.preventDefault();
                event.stopPropagation();

                handleWikiLinkClick(linkText);
                return true;
            }
        }

        console.log('[WikiLink] No wiki link at this position');
        return false;
    }
});

/**
 * Handle wiki link click - find note/document and open in split view
 */
async function handleWikiLinkClick(linkText: string): Promise<void> {
    try {
        let targetTitle = linkText;
        let isDocument = false;
        let pageNumber = 1;

        // Check for prefixes
        if (targetTitle.startsWith('doc:')) {
            isDocument = true;
            targetTitle = targetTitle.substring(4);
        } else if (targetTitle.startsWith('note:')) {
            targetTitle = targetTitle.substring(5);
        }

        // Parse page number (e.g., "Title#5")
        const pageMatch = targetTitle.match(/^(.+?)#(\d+)$/);
        if (pageMatch) {
            targetTitle = pageMatch[1];
            pageNumber = parseInt(pageMatch[2], 10);
        }

        // Strip .md suffix
        if (targetTitle.endsWith('.md')) {
            targetTitle = targetTitle.slice(0, -3);
        }

        if (isDocument) {
            // TODO: Search for document by title and open in split view
            console.log('[WikiLink] Opening document:', targetTitle, 'page:', pageNumber);
            // Document search would need documentService.searchByTitle to be implemented
        } else {
            // Search for note by title (exact match first, then partial)
            const notes = await noteService.search(targetTitle);

            // Find exact match (case-insensitive)
            const exactMatch = notes.find(
                (n) => n.title.toLowerCase() === targetTitle.toLowerCase()
            );

            if (exactMatch) {
                // Open in split view
                window.dispatchEvent(
                    new CustomEvent('open-note-split-view', {
                        detail: { noteId: exactMatch.id, title: exactMatch.title },
                    })
                );
                console.log('[WikiLink] ✅ Opening note in split view:', exactMatch.title);
            } else if (notes.length > 0) {
                // No exact match, but have partial matches - open first one
                const firstMatch = notes[0];
                window.dispatchEvent(
                    new CustomEvent('open-note-split-view', {
                        detail: { noteId: firstMatch.id, title: firstMatch.title },
                    })
                );
                console.log('[WikiLink] ✅ Opening partial match:', firstMatch.title);
            } else {
                // No matching note found
                console.log('[WikiLink] ⚠️ Note not found:', targetTitle);
                // Could optionally create the note or show a toast
            }
        }
    } catch (error) {
        console.error('[WikiLink] ❌ Failed to open link:', error);
    }
}
