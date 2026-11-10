import { visit, SKIP } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Link, Text, Parent } from 'mdast';
import { log } from '../lib/logger';
import { splitPageSuffix } from '../lib/wikilink';
log.debug('[remarkWikiLink] Module loaded!');

/**
 * Remark plugin to convert [[wiki-style]] links to markdown links
 * Supports multiple syntaxes:
 * - [[Title]] -> [Title](wikilink://Title) - auto search notes then documents (page 1)
 * - [[Title#5]] -> [Title](wikilink://Title?page=5) - with page number
 * - [[doc:Title]] -> [Title](document://Title?page=1) - document only (page 1)
 * - [[doc:Title#3]] -> [Title](document://Title?page=3) - document with page
 * - [[note:Title]] -> [Title.md](note://Title) - note only (displays with .md)
 */
export const remarkWikiLink: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      const text = node.value;
      const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;

      if (!wikiLinkRegex.test(text)) {
        return;
      }

      const newNodes: Array<Text | Link> = [];
      let lastIndex = 0;

      wikiLinkRegex.lastIndex = 0;
      let match;

      while ((match = wikiLinkRegex.exec(text)) !== null) {
        const [fullMatch, linkText] = match;
        const matchIndex = match.index;

        if (matchIndex > lastIndex) {
          newNodes.push({
            type: 'text' as const,
            value: text.slice(lastIndex, matchIndex),
          });
        }

        let protocol = 'wikilink';
        let displayText = linkText;
        let targetTitle = linkText;
        let pageNumber = '1'; // Default page

        // Step 1: Parse prefix (doc: or note:)
        if (linkText.startsWith('doc:')) {
          protocol = 'document';
          targetTitle = linkText.substring(4);
        } else if (linkText.startsWith('note:')) {
          protocol = 'note';
          targetTitle = linkText.substring(5);
        }
        // else: auto mode (wikilink)

        // Step 2: Parse page number from title (e.g., "Title#5" or "Title.md#5")
        const split = splitPageSuffix(targetTitle);
        targetTitle = split.title;
        if (split.page !== null) pageNumber = String(split.page);

        // Step 3: Strip .md suffix for auto mode (user may have typed [[Sample.md]])
        if (protocol === 'wikilink' && targetTitle.endsWith('.md')) {
          targetTitle = targetTitle.slice(0, -3);
        }

        // Step 4: Set display text
        if (protocol === 'note') {
          displayText = `${targetTitle}.md`; // Add .md suffix for notes
        } else {
          displayText = targetTitle;
        }

        // Build URL with page parameter for documents
        let url = `${protocol}://${targetTitle}`;
        if (protocol === 'document' || protocol === 'wikilink') {
          url += `?page=${pageNumber}`;
        }

        const linkNode: Link = {
          type: 'link',
          url,
          children: [
            {
              type: 'text',
              value: displayText,
            },
          ],
        };

        log.debug('[remarkWikiLink] Created link:', { url: linkNode.url, text: displayText, page: pageNumber });
        newNodes.push(linkNode);
        lastIndex = matchIndex + fullMatch.length;
      }

      if (lastIndex < text.length) {
        newNodes.push({
          type: 'text' as const,
          value: text.slice(lastIndex),
        });
      }

      if (newNodes.length > 0) {
        (parent as Parent).children.splice(index, 1, ...newNodes);
        return [SKIP, index];
      }
    });
  };
};

export default remarkWikiLink;
