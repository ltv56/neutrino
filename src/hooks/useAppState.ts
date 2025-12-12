import { useState, useEffect, useCallback } from 'react';

/**
 * Tracks the current application state for context capture.
 * Listens to events dispatched by components (PDFViewer, NoteEditor)
 * to maintain a unified view of what the user is currently doing.
 */
export const useAppState = () => {
  const [currentDocumentId, setCurrentDocumentId] = useState<string | undefined>(undefined);
  const [currentDocumentTitle, setCurrentDocumentTitle] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState<number | undefined>(undefined);
  const [scrollPosition, setScrollPosition] = useState<number | undefined>(undefined);

  // Listen for document state changes from PDFViewer
  useEffect(() => {
    const handleDocumentOpen = (e: CustomEvent) => {
      const { documentId, title } = e.detail;
      setCurrentDocumentId(documentId);
      setCurrentDocumentTitle(title);
      // Reset page/scroll when new document opens
      setCurrentPage(undefined);
      setScrollPosition(undefined);
    };

    const handlePageChange = (e: CustomEvent) => {
      const { page } = e.detail;
      setCurrentPage(page);
    };

    const handleScrollChange = (e: CustomEvent) => {
      const { scrollPosition: scroll } = e.detail;
      setScrollPosition(scroll);
    };

    window.addEventListener('pdf:document-open', handleDocumentOpen as EventListener);
    window.addEventListener('pdf:page-change', handlePageChange as EventListener);
    window.addEventListener('pdf:scroll-change', handleScrollChange as EventListener);

    return () => {
      window.removeEventListener('pdf:document-open', handleDocumentOpen as EventListener);
      window.removeEventListener('pdf:page-change', handlePageChange as EventListener);
      window.removeEventListener('pdf:scroll-change', handleScrollChange as EventListener);
    };
  }, []);

  const clearDocumentState = useCallback(() => {
    setCurrentDocumentId(undefined);
    setCurrentDocumentTitle(undefined);
    setCurrentPage(undefined);
    setScrollPosition(undefined);
  }, []);

  return {
    currentDocumentId,
    currentDocumentTitle,
    currentPage,
    scrollPosition,
    clearDocumentState,
  };
};
