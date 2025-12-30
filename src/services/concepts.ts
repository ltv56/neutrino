import { invoke } from '@tauri-apps/api/core';

export interface Concept {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  created_at: string;
  updated_at: string;
}

export interface CrossReference {
  concept_name: string;
  documents: CrossReferenceDocument[];
  notes: CrossReferenceNote[];
  confidence: number;
}

export interface CrossReferenceDocument {
  document_id: string;
  document_title: string;
  relationship: string;
}

export interface CrossReferenceNote {
  note_id: string;
  note_title: string;
  relationship: string;
}

export const conceptService = {
  async createConcept(
    name: string,
    description?: string,
    domain?: string
  ): Promise<Concept> {
    return await invoke('create_concept', {
      name,
      description: description || null,
      domain: domain || null,
    });
  },

  async linkConceptToDocument(
    conceptId: string,
    documentId: string,
    relationship: string,
    confidence: number = 1.0
  ): Promise<string> {
    return await invoke('link_concept_to_document', {
      conceptId,
      documentId,
      relationship,
      confidence,
    });
  },

  async linkConceptToNote(
    conceptId: string,
    noteId: string,
    relationship: string,
    confidence: number = 1.0
  ): Promise<string> {
    return await invoke('link_concept_to_note', {
      conceptId,
      noteId,
      relationship,
      confidence,
    });
  },

  async getCrossReferences(documentId: string): Promise<CrossReference[]> {
    return await invoke('get_cross_references', { documentId });
  },

  async getAllConcepts(): Promise<Concept[]> {
    return await invoke('get_all_concepts');
  },
};
