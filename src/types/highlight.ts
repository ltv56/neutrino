export interface Highlight {
  id: string;
  document_id: string;
  event_type: 'highlight' | 'note' | 'bookmark';
  page_number: number;
  position_data: HighlightPosition;
  content?: string; // Highlighted text
  note?: string;
  metadata?: HighlightMetadata;
  linked_note_id?: string; // Linked note for bi-directional linking
  created_at: string;
  updated_at: string;
}

export interface HighlightPosition {
  x: number; // X coordinate on PDF page (PDF coordinates)
  y: number; // Y coordinate on PDF page (PDF coordinates)
  width: number; // Width in PDF coordinates
  height: number; // Height in PDF coordinates
}

export interface HighlightMetadata {
  color?: string; // Highlight color (default: yellow)
}

// Selection coordinates (viewport/canvas coordinates)
export interface SelectionRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
