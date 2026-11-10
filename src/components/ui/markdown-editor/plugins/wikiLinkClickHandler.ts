import { EditorView } from '@codemirror/view';
import { noteService, documentService } from '@/services';
import { splitPageSuffix } from '../../../../lib/wikilink';

/**
 * Extension to handle Ctrl+Click on wiki links [[...]]
 * Single click: normal editing behavior (places cursor in link)
 * Ctrl+Click (Cmd+Click on Mac): opens the linked note in split view
 */
export const wikiLinkClickHandler = EditorView.domEventHandlers({
    mousedown: (event: MouseEvent, view: EditorView) => {
        // Only handle Ctrl+Click (Windows/Linux) or Cmd+Click (Mac)
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modifierPressed = isMac ? event.metaKey : event.ctrlKey;

        if (!modifierPressed) {
            return false; // No modifier key, let normal behavior happen
        }

        // Check if clicked element or parent has wiki link class
        const target = event.target as HTMLElement;
        const isWikiLink = target.classList.contains('cm-wikilink-text') ||
                          target.classList.contains('cm-wikilink-editing') ||
                          target.closest('.cm-wikilink-text') ||
                          target.closest('.cm-wikilink-editing');

        if (!isWikiLink) {
            return false; // Not clicking on wiki link
        }

        // Get clicked position to find the link text
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos === null) {
            return false;
        }

        const line = view.state.doc.lineAt(pos);
        const lineText = line.text;

        // Find wiki links in this line
        const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
        let match;

        while ((match = wikiLinkRegex.exec(lineText)) !== null) {
            const matchStart = line.from + match.index;
            const matchEnd = matchStart + match[0].length;

            // Check if clicked position is within this wiki link
            if (pos >= matchStart && pos <= matchEnd) {
                const linkText = match[1];

                // Prevent default behavior immediately
                event.preventDefault();
                event.stopPropagation();

                handleWikiLinkClick(linkText);
                return true;
            }
        }

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
        const split = splitPageSuffix(targetTitle);
        targetTitle = split.title;
        if (split.page !== null) pageNumber = split.page;

        // Auto-detect document by file extension
        if (!isDocument && (targetTitle.endsWith('.pdf') || targetTitle.endsWith('.docx') || targetTitle.endsWith('.txt'))) {
            isDocument = true;
        }

        // Strip .md suffix for notes
        if (!isDocument && targetTitle.endsWith('.md')) {
            targetTitle = targetTitle.slice(0, -3);
        }

        if (isDocument) {
            const documents = await documentService.getAll();

            let match = documents.find((d) => d.title.toLowerCase() === targetTitle.toLowerCase());

            if (!match) {
                const titleWithoutExt = targetTitle.replace(/\.(pdf|docx|txt)$/i, '');
                match = documents.find((d) => d.title.toLowerCase() === titleWithoutExt.toLowerCase());
            }

            if (!match && !targetTitle.endsWith('.pdf')) {
                match = documents.find((d) => d.title.toLowerCase() === (targetTitle + '.pdf').toLowerCase());
            }

            if (match) {
                window.dispatchEvent(
                    new CustomEvent('open-document-split-view', {
                        detail: {
                            documentId: match.id,
                            title: match.title,
                            page: pageNumber
                        },
                    })
                );
            }
        } else {
            const notes = await noteService.search(targetTitle);
            const exactMatch = notes.find((n) => n.title.toLowerCase() === targetTitle.toLowerCase());

            if (exactMatch) {
                window.dispatchEvent(
                    new CustomEvent('open-note-split-view', {
                        detail: { noteId: exactMatch.id, title: exactMatch.title },
                    })
                );
            } else if (notes.length > 0) {
                window.dispatchEvent(
                    new CustomEvent('open-note-split-view', {
                        detail: { noteId: notes[0].id, title: notes[0].title },
                    })
                );
            }
        }
    } catch (error) {
        console.error('[WikiLink] ❌ Failed to open link:', error);
    }
}
