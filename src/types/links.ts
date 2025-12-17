export interface NoteLink {
  id: string;
  source_note_id: string;
  target_note_id?: string;
  target_document_id?: string;
  source_position?: string;
  target_position?: string;
  link_type: string;
  link_text: string;
  resolved: boolean;
  context?: string;
  created_at: string;
  updated_at: string;
}

export interface LinkTarget {
  id: string;
  title: string;
  target_type: 'note' | 'document';
  content_preview?: string;
}

export interface NoteLinkWithSource {
  link: NoteLink;
  source_title: string;
  source_content_preview: string;
}

export interface NoteLinkWithTarget {
  link: NoteLink;
  target_title?: string;
  target_type?: 'note' | 'document' | 'unresolved';
}

export interface BacklinksResult {
  incoming: NoteLinkWithSource[];
  outgoing: NoteLinkWithTarget[];
}

export interface ParsedLink {
  text: string;
  type: 'wikilink' | 'document' | 'note';
  position: {
    line: number;
    from: number;
    to: number;
  };
  page?: number;
}

export type LinkType = 'reference' | 'quote' | 'concept' | 'contradicts' | 'supports';
