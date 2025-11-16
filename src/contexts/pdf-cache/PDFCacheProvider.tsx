import React, { useEffect, useState, useCallback } from 'react';
import { LRUCache } from 'lru-cache';
import type * as pdfjsLib from 'pdfjs-dist';
import { PDFCacheContext, type CacheConfig } from './PDFCacheContext';

type PDFDocumentProxy = pdfjsLib.PDFDocumentProxy;
type PDFPageProxy = pdfjsLib.PDFPageProxy;

// Cache config: 5 documents, 20 pages
// TODO: Can enable auto-adjust based on available memory later if needed
const CACHE_CONFIG: CacheConfig = { maxFiles: 5, maxMemoryMB: 50 };

// Optional: Auto-adjust cache size based on system memory
// async function calculateCacheConfig(): Promise<CacheConfig> {
//   try {
//     const availableMemory = await invoke<number>('get_available_memory');
//     if (availableMemory > 4_000_000_000) {
//       return { maxFiles: 10, maxMemoryMB: 100 };
//     }
//   } catch (error) {}
//   return { maxFiles: 5, maxMemoryMB: 50 };
// }

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
          console.log(`[PDF Cache] ➖ Evicted document (~${metadataSizeMB}MB freed)`);
        },
      });

      setCache(lruCache);

      // Create page-level cache (max 20 pages across all documents)
      const pageLruCache = new LRUCache<string, PDFPageProxy>({
        max: 20, // Keep max 20 rendered pages in memory
        dispose: async (page, key) => {
          const pageSizeMB = 1.5;
          setTotalEstimatedMB(prev => Math.max(0, prev - pageSizeMB));
          console.log(`[Page Cache] ➖ Evicted ${key.split('-p')[1]} (~${pageSizeMB}MB freed)`);
          try {
            await page.cleanup();
          } catch (err) {
            // Ignore cleanup errors
          }
        },
      });

      setPageCache(pageLruCache);
      console.log(`[PDF Cache] Initialized: ${CACHE_CONFIG.maxFiles} documents, 20 pages max`);
    };

    initCache();
  }, []);

  const getDocument = useCallback((documentId: string): PDFDocumentProxy | undefined => {
    if (!cache) return undefined;
    const pdf = cache.get(documentId);
    if (pdf) {
      console.log(`[PDF Cache] ✅ Document HIT`);
    }
    return pdf;
  }, [cache]);

  const setDocument = useCallback((documentId: string, pdf: PDFDocumentProxy) => {
    if (!cache) return;

    // Document metadata only (NOT all pages) - lightweight!
    const metadataSizeMB = 2; // ~2MB for document structure/metadata
    const newTotal = totalEstimatedMB + metadataSizeMB;
    setTotalEstimatedMB(newTotal);

    console.log(`[PDF Cache] ➕ Cached document (${cache.size + 1}/${CACHE_CONFIG.maxFiles}) - ${pdf.numPages} pages metadata`);
    cache.set(documentId, pdf);
  }, [cache, totalEstimatedMB]);

  const getPage = useCallback((documentId: string, pageNum: number): PDFPageProxy | undefined => {
    if (!pageCache) return undefined;
    const key = `${documentId}-p${pageNum}`;
    const page = pageCache.get(key);
    if (page) {
      console.log(`[Page Cache] ✅ HIT - page ${pageNum} (${pageCache.size}/20 pages cached)`);
    } else {
      console.log(`[Page Cache] ❌ MISS - page ${pageNum} (will load & cache)`);
    }
    return page;
  }, [pageCache]);

  const setPage = useCallback((documentId: string, pageNum: number, page: PDFPageProxy) => {
    if (!pageCache) return;
    const key = `${documentId}-p${pageNum}`;

    // Track page memory (each rendered page ~1-2MB average)
    const pageSizeMB = 1.5;
    const newTotal = totalEstimatedMB + pageSizeMB;
    setTotalEstimatedMB(newTotal);

    const willEvict = pageCache.size >= 20;
    if (willEvict) {
      console.log(`[Page Cache] ⚠️ FULL - evicting oldest page`);
    }

    console.log(`[Page Cache] ➕ Cached page ${pageNum} (${pageCache.size + 1}/20 pages)`);
    pageCache.set(key, page);
  }, [pageCache, totalEstimatedMB]);

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
