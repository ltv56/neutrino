import { invoke } from '@tauri-apps/api/core';
import type { NoteLink, LinkTarget, BacklinksResult, ParsedLink, LinkType } from '@/types';

export const noteLinkService = {
  /**
   * Create a new link when user types [[link]]
   */
  async create(
    sourceNoteId: string,
    linkText: string,
    linkType: LinkType,
    sourcePosition?: string,
    context?: string
  ): Promise<NoteLink> {
    return invoke('create_note_link', {
      sourceNoteId,
      linkText,
      linkType,
      sourcePosition,
      context,
    });
  },

  /**
   * Resolve a link by setting its target
   */
  async resolveLink(
    linkId: string,
    targetNoteId?: string,
    targetDocumentId?: string
  ): Promise<void> {
    return invoke('resolve_note_link', {
      linkId,
      targetNoteId,
      targetDocumentId,
    });
  },

  /**
   * Get both incoming and outgoing links for a note
   */
  async getBacklinks(noteId: string): Promise<BacklinksResult> {
    return invoke('get_backlinks', { noteId });
  },

  /**
   * Get incoming links for a document (notes that link to this document)
   */
  async getDocumentBacklinks(documentId: string): Promise<BacklinksResult> {
    return invoke('get_document_backlinks', { documentId });
  },

  /**
   * Search for potential link targets by title
   */
  async searchTargets(query: string, sessionId?: string): Promise<LinkTarget[]> {
    return invoke('search_link_targets', { query, sessionId });
  },

  /**
   * Sync links for a note - called after note save
   */
  async syncLinks(noteId: string, links: ParsedLink[]): Promise<void> {
    const parsedLinks = links.map((link) => ({
      link_text: link.text,
      link_type: this.inferLinkType(link.text),
      context: undefined,
    }));

    return invoke('sync_note_links', { noteId, links: parsedLinks });
  },

  /**
   * Delete a link
   */
  async deleteLink(linkId: string): Promise<boolean> {
    return invoke('delete_note_link', { linkId });
  },

  /**
   * Parse markdown content for wiki links
   */
  parseLinks(content: string): ParsedLink[] {
    const links: ParsedLink[] = [];
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // Match [[...]] patterns
      const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
      let match;

      while ((match = wikiLinkRegex.exec(line)) !== null) {
        const fullText = match[1];
        let type: 'wikilink' | 'document' | 'note' = 'wikilink';
        let cleanText = fullText;
        let page: number | undefined;

        // Parse prefix
        if (fullText.startsWith('doc:')) {
          type = 'document';
          cleanText = fullText.substring(4);
        } else if (fullText.startsWith('note:')) {
          type = 'note';
          cleanText = fullText.substring(5);
        }

        // Parse page number
        const pageMatch = cleanText.match(/#(\d+)$/);
        if (pageMatch) {
          page = parseInt(pageMatch[1]);
          cleanText = cleanText.substring(0, cleanText.lastIndexOf('#'));
        }

        links.push({
          text: cleanText,
          type,
          position: {
            line: lineIndex,
            from: match.index,
            to: match.index + match[0].length,
          },
          page,
        });
      }
    });

    return links;
  },

  /**
   * Infer link type from link text (basic heuristic)
   */
  inferLinkType(linkText: string): LinkType {
    const lower = linkText.toLowerCase();

    if (lower.includes('vs') || lower.includes('contradicts')) {
      return 'contradicts';
    }
    if (lower.includes('supports') || lower.includes('agrees')) {
      return 'supports';
    }
    if (lower.includes('quote') || lower.startsWith('"')) {
      return 'quote';
    }
    if (lower.includes('concept:') || lower.includes('definition')) {
      return 'concept';
    }

    return 'reference';
  },

  /**
   * Extract link title from full link text (remove prefixes and page numbers)
   */
  extractTitle(linkText: string): string {
    let clean = linkText;

    // Remove prefix
    if (clean.startsWith('doc:')) clean = clean.substring(4);
    if (clean.startsWith('note:')) clean = clean.substring(5);

    // Remove page number
    const pageMatch = clean.match(/#\d+$/);
    if (pageMatch) {
      clean = clean.substring(0, clean.lastIndexOf('#'));
    }

    return clean.trim();
  },
};
