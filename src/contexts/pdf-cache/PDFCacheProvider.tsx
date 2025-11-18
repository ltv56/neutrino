import React, { useEffect, useState, useCallback } from 'react';
import { LRUCache } from 'lru-cache';
import type * as pdfjsLib from 'pdfjs-dist';
import { PDFCacheContext, type CacheConfig } from './PDFCacheContext';

type PDFDocumentProxy = pdfjsLib.PDFDocumentProxy;
type PDFPageProxy = pdfjsLib.PDFPageProxy;

// Cache config: 5 documents, 20 pages
const CACHE_CONFIG: CacheConfig = { maxFiles: 5, maxMemoryMB: 50 };

export const PDFCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cache, setCache] = useState<LRUCache<string, PDFDocumentProxy> | null>(null);
  const [pageCache, setPageCache] = useState<LRUCache<string, PDFPageProxy> | null>(null);
  const [totalEstimatedMB, setTotalEstimatedMB] = useState<number>(0);

  // Initialize LRU caches
  useEffect(() => {
    const initCache = () => {
      // Create LRU cache with file count limit only
      const lruCache = new LRUCache<string, PDFDocumentProxy>({
        max: CACHE_CONFIG.maxFiles,
        dispose: (pdf, key) => {
          const metadataSizeMB = 2;
          setTotalEstimatedMB(prev => Math.max(0, prev - metadataSizeMB));
        },
      });

      setCache(lruCache);

      // Create page-level cache (max 20 pages across all documents)
      const pageLruCache = new LRUCache<string, PDFPageProxy>({
        max: 20, // Keep max 20 rendered pages in memory
        dispose: async (page, key) => {
          const pageSizeMB = 1.5;
          setTotalEstimatedMB(prev => Math.max(0, prev - pageSizeMB));
          try {
            await page.cleanup();
          } catch (err) {
            // Ignore cleanup errors
          }
        },
      });

      setPageCache(pageLruCache);
    };

    initCache();
  }, []);

  const getDocument = useCallback((documentId: string): PDFDocumentProxy | undefined => {
    if (!cache) return undefined;
    return cache.get(documentId);
  }, [cache]);

  const setDocument = useCallback((documentId: string, pdf: PDFDocumentProxy) => {
    if (!cache) return;

    // Document metadata only (NOT all pages) - lightweight!
    const metadataSizeMB = 2; // ~2MB for document structure/metadata
    setTotalEstimatedMB(prev => prev + metadataSizeMB);

    cache.set(documentId, pdf);
  }, [cache]);

  const getPage = useCallback((documentId: string, pageNum: number): PDFPageProxy | undefined => {
    if (!pageCache) return undefined;
    const key = `${documentId}-p${pageNum}`;
    return pageCache.get(key);
  }, [pageCache]);

  const setPage = useCallback((documentId: string, pageNum: number, page: PDFPageProxy) => {
    if (!pageCache) return;
    const key = `${documentId}-p${pageNum}`;

    // Check if page already cached (avoid duplicate counting)
    const alreadyCached = pageCache.has(key);
    if (alreadyCached) {
      // Just update LRU position, no memory change
      pageCache.set(key, page);
      return;
    }

    // Track page memory (each rendered page ~1-2MB average)
    const pageSizeMB = 1.5;

    // Set page (LRU will evict if needed)
    pageCache.set(key, page);

    setTotalEstimatedMB(prev => prev + pageSizeMB);
  }, [pageCache]);

  const clearCache = useCallback(() => {
    if (!cache || !pageCache) return;
    cache.clear();
    pageCache.clear();
    setTotalEstimatedMB(0);
  }, [cache, pageCache]);

  if (!cache || !pageCache) {
    // Cache not initialized yet
    return null;
  }

  return (
    <PDFCacheContext.Provider value={{ getDocument, setDocument, getPage, setPage, clearCache, cacheConfig: CACHE_CONFIG }}>
      {children}
    </PDFCacheContext.Provider>
  );
};
