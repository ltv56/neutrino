import { createContext } from 'react';
import type * as pdfjsLib from 'pdfjs-dist';

type PDFDocumentProxy = pdfjsLib.PDFDocumentProxy;
type PDFPageProxy = pdfjsLib.PDFPageProxy;

export interface CacheConfig {
  maxFiles: number;
  maxMemoryMB: number;
}

export interface PDFCacheContextType {
  getDocument: (documentId: string) => PDFDocumentProxy | undefined;
  setDocument: (documentId: string, pdf: PDFDocumentProxy) => void;
  getPage: (documentId: string, pageNum: number) => PDFPageProxy | undefined;
  setPage: (documentId: string, pageNum: number, page: PDFPageProxy) => void;
  clearCache: () => void;
  cacheConfig: CacheConfig;
}

export const PDFCacheContext = createContext<PDFCacheContextType | undefined>(undefined);
