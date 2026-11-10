import { WidgetType } from '@codemirror/view';
import { noteService } from '@/services';
import { log } from '../../../../lib/logger';
import { splitPageSuffix } from '../../../../lib/wikilink';

/**
 * WikiLinkWidget - Clickable widget for [[wiki links]]
 * When clicked, opens the linked note in split view
 */
export class WikiLinkWidget extends WidgetType {
    private linkText: string;
    private displayText: string;

    constructor(linkText: string, displayText: string) {
        super();
        this.linkText = linkText;
        this.displayText = displayText;
    }

    eq(other: WikiLinkWidget): boolean {
        return other.linkText === this.linkText && other.displayText === this.displayText;
    }

    toDOM(): HTMLElement {
        const span = document.createElement('span');
        span.className = 'cm-wikilink-text';
        span.textContent = this.displayText;
        span.style.cursor = 'pointer';

        // Handle click to open linked note in split view
        span.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
                // Parse link text for special prefixes
                let targetTitle = this.linkText;
                let isDocument = false;
                let isNote = false;
                let pageNumber = 1;

                // Check for prefixes
                if (targetTitle.startsWith('doc:')) {
                    isDocument = true;
                    targetTitle = targetTitle.substring(4);
                } else if (targetTitle.startsWith('note:')) {
                    isNote = true;
                    targetTitle = targetTitle.substring(5);
                }

                // Parse page number (e.g., "Title#5")
                const split = splitPageSuffix(targetTitle);
                targetTitle = split.title;
                if (split.page !== null) pageNumber = split.page;

                // Strip .md suffix
                if (targetTitle.endsWith('.md')) {
                    targetTitle = targetTitle.slice(0, -3);
                }

                if (isDocument) {
                    // TODO: Search for document by title and open in split view
                    log.debug('[WikiLink] Opening document:', targetTitle, 'page:', pageNumber);
                    // For now, just log - document search would need to be implemented
                } else {
                    // Search for note by title
                    const notes = await noteService.search(targetTitle);
                    const matchingNote = notes.find(
                        (n) => n.title.toLowerCase() === targetTitle.toLowerCase()
                    );

                    if (matchingNote) {
                        // Open in split view
                        window.dispatchEvent(
                            new CustomEvent('open-note-split-view', {
                                detail: { noteId: matchingNote.id, title: matchingNote.title },
                            })
                        );
                    } else {
                        // No matching note found - could create one or show message
                        log.debug('[WikiLink] Note not found:', targetTitle);

                        // Optionally: Create new note with this title
                        // For now, show a subtle indication that note doesn't exist
                    }
                }
            } catch (error) {
                console.error('[WikiLink] Failed to open link:', error);
            }
        });

        return span;
    }

    ignoreEvent(): boolean {
        return false; // Allow click events to propagate
    }
}
