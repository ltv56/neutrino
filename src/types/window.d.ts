export {};

declare global {
  interface Window {
    __lastNoteActivated?: { noteId: string } | null;
    __lastDocumentActivated?: { documentId: string } | null;
    __debugCaptureContext?: () => unknown;
    __debugPhasePersistence?: () => unknown;
    __debugSaveTabState?: () => unknown;
  }
}
