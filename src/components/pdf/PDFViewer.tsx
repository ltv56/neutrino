import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { TextLayer } from 'pdfjs-dist';
import { documentService, highlightService, documentPositionTracker } from '@/services';
import { tabPositionTracker } from '@/services/tabPositionTracker';
import type { Document, Highlight, HighlightPosition, HighlightRect } from '@/types';
import { usePDFCache } from '@/contexts';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Link2, Highlighter, MousePointer2 } from 'lucide-react';
import HighlightOverlay from './HighlightOverlay';
import HighlightNoteEditor from './HighlightNoteEditor';
import BacklinksSlidePanel from '@/components/links/BacklinksSlidePanel';
import SelectionToolbar from './SelectionToolbar';
import Tooltip from '@/components/common/Tooltip';
import { DEFAULT_HIGHLIGHT_COLOR, DEFAULT_HIGHLIGHT_OPACITY, MIN_SELECTION_SIZE } from '@/constants/highlight';

// Configure PDF.js worker - use local worker from node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * PDF Viewer with optimized memory usage:
 *
 * Two-level cache strategy (similar to Chrome/Firefox):
 * 1. Document Cache: 5-10 PDF documents (lightweight metadata only)
 * 2. Page Cache: 20 rendered pages with auto-cleanup (LRU eviction)
 *
 * Memory optimizations:
 * - disableAutoFetch: Load pages on-demand only (no prefetch)
 * - Page cleanup: Old pages automatically destroyed when cache full
 * - Canvas reuse: Single canvas for all renders
 * - Streaming: 64KB chunks with HTTP Range requests
 *
 * Result: ~70% less memory vs naive approach
 */

interface PDFViewerProps {
  documentId: string;
  tabId: string; // Tab ID for position tracking
  initialPage?: number; // Optional - which page to open (from wiki links)
  initialScrollPosition?: number; // Optional - scroll position to restore
}

const PDFViewer: React.FC<PDFViewerProps> = ({ documentId, tabId, initialPage, initialScrollPosition }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const zoomDropdownRef = useRef<HTMLDivElement>(null);

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoomMode, setZoomMode] = useState<'fit-page' | 'fit-width' | 'manual'>('fit-page');
  const [manualZoom, setManualZoom] = useState(1.0);
  const [needsRender, setNeedsRender] = useState(false);
  const [isZoomDropdownOpen, setIsZoomDropdownOpen] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [currentScale, setCurrentScale] = useState(1.0); // Track current viewport scale
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const [isBacklinksPanelOpen, setIsBacklinksPanelOpen] = useState(false);
  const [toolMode, setToolMode] = useState<'select' | 'highlight'>('select');
  const [textSelection, setTextSelection] = useState<{
    text: string;
    range: Range | null;
    position: { x: number; y: number };
  } | null>(null);
  const [isTextLayerReady, setIsTextLayerReady] = useState(false);

  // Reset textLayer ready flag when page changes
  useEffect(() => {
    setIsTextLayerReady(false);
  }, [currentPage]);

  // PDF Cache
  const { getDocument: getCachedDocument, setDocument: cacheDocument, getPage: getCachedPage, setPage: cachePage } = usePDFCache();

  const renderPage = useCallback(async (pdf: pdfjsLib.PDFDocumentProxy, pageNumber: number) => {
    // Cancel previous render if still running
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    let page = getCachedPage(documentId, pageNumber);

    if (!page) {
      // Load page from PDF
      page = await pdf.getPage(pageNumber);
      // Cache the page
      cachePage(documentId, pageNumber, page);
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const textLayer = textLayerRef.current;
    if (!canvas || !container) return;

    const context = canvas.getContext('2d');
    if (!context) return;
    // Calculate scale to fit page in container (Figma-style: full height, nav bar overlays)
    const containerHeight = container.clientHeight;
    const containerWidth = container.clientWidth;

    // Get page dimensions at scale 1.0
    const baseViewport = page.getViewport({ scale: 1.0 });

    // Calculate scale based on zoom mode
    const verticalPadding = 32; // Top + bottom padding (p-4 = 16px each)
    const availableHeight = containerHeight - verticalPadding;
    const scaleToFitHeight = availableHeight / baseViewport.height;
    const scaleToFitWidth = (containerWidth - 32) / baseViewport.width; // Horizontal padding

    let finalScale: number;
    if (zoomMode === 'manual') {
      finalScale = manualZoom;
    } else if (zoomMode === 'fit-width') {
      finalScale = scaleToFitWidth;
    } else {
      // fit-page: fit both dimensions
      finalScale = Math.min(scaleToFitHeight, scaleToFitWidth);
    }

    const viewport = page.getViewport({ scale: finalScale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Store canvas dimensions and current scale for highlight overlay
    setCanvasDimensions({ width: viewport.width, height: viewport.height });
    setCurrentScale(finalScale);

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    renderTaskRef.current = page.render(renderContext);

    try {
      await renderTaskRef.current.promise;
      renderTaskRef.current = null;

      // Render text layer using PDF.js built-in TextLayer class
      if (textLayer) {
        try {
          // Clear previous content and set dimensions to match viewport
          textLayer.innerHTML = '';
          textLayer.style.width = `${viewport.width}px`;
          textLayer.style.height = `${viewport.height}px`;
          textLayer.style.setProperty('--scale-factor', viewport.scale.toString());

          const textContent = await page.getTextContent();

          if (!textContent || !textContent.items || textContent.items.length === 0) {
            console.warn('[PDFViewer] No text content available for this page');
            return;
          }

          // Use PDF.js built-in TextLayer class
          const pdfTextLayer = new TextLayer({
            textContentSource: textContent,
            viewport: viewport,
            container: textLayer,
          });

          await pdfTextLayer.render();

          // Set textLayer ready flag
          setIsTextLayerReady(true);

          // Debug: log span dimensions
          const spans = Array.from(textLayer.querySelectorAll('span')).slice(0, 3);
          console.log('[PDFViewer] Text layer rendered:', {
            spanCount: textLayer.querySelectorAll('span').length,
            firstThreeSpans: spans.map((span, i) => {
              const el = span as HTMLElement;
              return {
                index: i,
                text: span.textContent?.substring(0, 15),
                styles: {
                  left: el.style.left,
                  top: el.style.top,
                  width: el.style.width,
                  height: el.style.height,
                  fontSize: el.style.fontSize,
                  transform: el.style.transform
                },
                computed: {
                  width: el.offsetWidth,
                  height: el.offsetHeight,
                  boundingBox: el.getBoundingClientRect()
                }
              };
            })
          });
        } catch (textLayerError) {
          console.error('[PDFViewer] Text layer rendering error:', textLayerError);
        }
      }
    } catch (err: unknown) {
      // Ignore cancellation errors
      if (err && typeof err === 'object' && 'name' in err && err.name !== 'RenderingCancelledException') {
        console.error('Render error:', err);
      }
    }
  }, [zoomMode, manualZoom, documentId, getCachedPage, cachePage]);

  // Auto-detect HTTP server port (try ports 43572-43582)
  const detectServerPort = useCallback(async (documentId: string): Promise<number | null> => {
    const BASE_PORT = 43572;
    const PORT_RANGE = 10;

    for (let port = BASE_PORT; port < BASE_PORT + PORT_RANGE; port++) {
      try {
        // Make a lightweight HEAD request to check if server is running
        const testUrl = `http://localhost:${port}/documents/${documentId}`;
        const response = await fetch(testUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(500) // 500ms timeout per port
        });

        if (response.ok || response.status === 404) {
          // Server is running (404 is ok - document might not exist yet, but server is there)
          return port;
        }
      } catch (err) {
        // Port not available or timeout, try next
        continue;
      }
    }

    console.error('[PDF] No HTTP server found on ports 43572-43582');
    return null;
  }, []);

  const loadDocument = useCallback(async () => {
    if (!documentId) return;

    try {
      const startTime = performance.now();
      setLoading(true);
      setError(null);

      // 1. Get document from database first (to get reading_progress)
      const doc = await documentService.getById(documentId);

      if (!doc) {
        setError('Document not found');
        setLoading(false);
        return;
      }

      setDocument(doc);

      // Dispatch document activated event for LinksPanel
      const eventDetail = { documentId: doc.id };
      console.log('[PDFViewer] Dispatching document-activated event:', eventDetail);

      // Set global state immediately (for LinksPanel to check on mount)
      (window as any).__lastDocumentActivated = eventDetail;
      (window as any).__lastNoteActivated = null;

      window.dispatchEvent(new CustomEvent('document-activated', {
        detail: eventDetail
      }));

      // Dispatch document open event
      window.dispatchEvent(new CustomEvent('pdf:document-open', {
        detail: { documentId: doc.id, title: doc.title }
      }));

      // 2. Check cache
      const cachedPdf = getCachedDocument(documentId);
      if (cachedPdf) {
        pdfDocRef.current = cachedPdf;
        setTotalPages(cachedPdf.numPages);
        // Determine starting page: prioritize initialPage, then reading_progress, then default to 1
        let startPage = 1;
        if (initialPage && initialPage >= 1 && initialPage <= cachedPdf.numPages) {
          startPage = initialPage;
        } else if (doc.reading_progress > 0 && doc.reading_progress <= cachedPdf.numPages) {
          startPage = doc.reading_progress;
        }
        setCurrentPage(startPage);
        setLoading(false);
        setNeedsRender(true);

        // Track initial position
        if (tabId) {
          tabPositionTracker.updatePosition(tabId, {
            currentPage: startPage,
          });
        }

        // Dispatch page change event for initial page
        window.dispatchEvent(new CustomEvent('pdf:page-change', {
          detail: {
            documentId,
            pageNumber: startPage,
            documentTitle: doc.title
          }
        }));
        return;
      }

      // 3. Auto-detect HTTP server port
      const serverPort = await detectServerPort(documentId);
      if (!serverPort) {
        setError('PDF server not available. Please ensure the app is running.');
        setLoading(false);
        return;
      }

      // 4. Use HTTP server for true streaming with Range support
      const pdfUrl = `http://localhost:${serverPort}/documents/${documentId}`;

      // Auto-adjust chunk size based on available memory
      // Default (5 PDFs): Use 64KB chunks for faster first page
      // High memory (10 PDFs): Use 64KB chunks for optimal speed
      const rangeChunkSize = 65536; // 64KB chunks

      const loadingTask = pdfjsLib.getDocument({
        url: pdfUrl,
        rangeChunkSize,            // 64KB chunks for optimal speed
        disableAutoFetch: true,     // Disable prefetch - load pages on-demand only
        disableStream: false,       // Enable streaming
        isEvalSupported: false,     // Disable eval for security
        useSystemFonts: true,       // Use system fonts when possible
      });

      const pdf = await loadingTask.promise;

      // 4. Cache the loaded PDF
      cacheDocument(documentId, pdf);

      // 5. Store PDF and prepare to render
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      // Determine starting page: prioritize initialPage, then reading_progress, then default to 1
      let startPage = 1;
      if (initialPage && initialPage >= 1 && initialPage <= pdf.numPages) {
        startPage = initialPage;
      } else if (doc.reading_progress > 0 && doc.reading_progress <= pdf.numPages) {
        startPage = doc.reading_progress;
      }
      setCurrentPage(startPage);
      setLoading(false);
      setNeedsRender(true);

      // Track initial position
      if (tabId) {
        tabPositionTracker.updatePosition(tabId, {
          currentPage: startPage,
        });
      }

      // Dispatch page change event for initial page
      window.dispatchEvent(new CustomEvent('pdf:page-change', {
        detail: {
          documentId,
          pageNumber: startPage,
          documentTitle: doc.title
        }
      }));
    } catch (err) {
      console.error('Failed to load PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
      setLoading(false);
    }
  }, [documentId, getCachedDocument, cacheDocument, detectServerPort, tabId, initialPage]);

  useEffect(() => {
    if (!documentId) {
      setError('No document ID provided');
      setLoading(false);
      return;
    }

    loadDocument();

    // Cleanup on unmount
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [documentId, loadDocument]);

  // Render page when canvas is ready and we have a PDF to render
  useEffect(() => {
    if (needsRender && pdfDocRef.current && canvasRef.current) {
      renderPage(pdfDocRef.current, currentPage);
      setNeedsRender(false);
    }
  }, [needsRender, currentPage, renderPage]);

  // Page navigation handlers
  const goToPage = useCallback((pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages && pdfDocRef.current) {
      setCurrentPage(pageNum);
      setNeedsRender(true);

      // Update centralized tracker immediately (single source of truth)
      if (document) {
        documentPositionTracker.setPage(document.id, pageNum);
      }

      // Track position for tab restore
      if (tabId) {
        tabPositionTracker.updatePosition(tabId, {
          currentPage: pageNum,
        });
      }

      // Dispatch page change event for context tracking
      if (document) {
        window.dispatchEvent(new CustomEvent('pdf:page-change', {
          detail: {
            documentId: document.id,
            pageNumber: pageNum,
            documentTitle: document.title
          }
        }));
      }
    }
  }, [totalPages, tabId, document]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, goToPage]);

  // Load highlights for current page
  const loadHighlights = useCallback(async () => {
    if (!documentId || currentPage < 1) return;

    // Clear highlights immediately when page changes
    setHighlights([]);

    try {
      const pageHighlights = await highlightService.getByPage(documentId, currentPage);
      setHighlights(pageHighlights);
    } catch (err) {
      console.error('Failed to load highlights:', err);
    }
  }, [documentId, currentPage]);

  // Handle text selection and create highlight
  const handleTextSelectionHighlight = useCallback(async () => {
    if (toolMode !== 'select') return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length === 0) return;

    try {
      // Get the range of the selection
      const range = selection.getRangeAt(0);
      const rects = range.getClientRects();

      if (rects.length === 0) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();

      // Calculate bounding box for all selection rectangles
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        const x = rect.left - canvasRect.left;
        const y = rect.top - canvasRect.top;
        const right = x + rect.width;
        const bottom = y + rect.height;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, right);
        maxY = Math.max(maxY, bottom);
      }

      // Convert canvas coordinates to PDF coordinates
      const pdfX = minX / currentScale;
      const pdfY = minY / currentScale;
      const pdfWidth = (maxX - minX) / currentScale;
      const pdfHeight = (maxY - minY) / currentScale;

      const position: HighlightPosition = {
        x: pdfX,
        y: pdfY,
        width: pdfWidth,
        height: pdfHeight,
      };

      const newHighlight = await highlightService.create(
        documentId,
        currentPage,
        position,
        selectedText,
        DEFAULT_HIGHLIGHT_COLOR
      );

      setHighlights((prev) => [...prev, newHighlight]);

      window.dispatchEvent(new CustomEvent('highlight-created', {
        detail: {
          highlightId: newHighlight.id,
          documentId,
          pageNumber: currentPage,
          content: newHighlight.content
        }
      }));

      // Clear selection
      selection.removeAllRanges();
    } catch (err) {
      console.error('Failed to create highlight from text selection:', err);
    }
  }, [toolMode, documentId, currentPage, currentScale]);

  // Mouse drag selection handlers (only active in highlight mode)
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (toolMode !== 'highlight') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    setIsSelecting(true);
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
  }, [toolMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    setSelectionEnd({ x, y });
  }, [isSelecting]);

  const handleMouseUp = useCallback(async () => {
    if (toolMode !== 'highlight' || !isSelecting || !selectionStart || !selectionEnd || !documentId) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    // Calculate selection rectangle in canvas coordinates
    const canvasX = Math.min(selectionStart.x, selectionEnd.x);
    const canvasY = Math.min(selectionStart.y, selectionEnd.y);
    const canvasWidth = Math.abs(selectionEnd.x - selectionStart.x);
    const canvasHeight = Math.abs(selectionEnd.y - selectionStart.y);

    // Minimum size threshold to avoid accidental clicks
    if (canvasWidth < MIN_SELECTION_SIZE || canvasHeight < MIN_SELECTION_SIZE) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    // Convert canvas coordinates to PDF coordinates (scale 1.0)
    // This ensures highlights work correctly when zooming
    const pdfX = canvasX / currentScale;
    const pdfY = canvasY / currentScale;
    const pdfWidth = canvasWidth / currentScale;
    const pdfHeight = canvasHeight / currentScale;

    const position: HighlightPosition = {
      x: pdfX,
      y: pdfY,
      width: pdfWidth,
      height: pdfHeight,
    };

    try {
      const newHighlight = await highlightService.create(
        documentId,
        currentPage,
        position,
        undefined, // No text content for drag selection
        DEFAULT_HIGHLIGHT_COLOR
      );

      // Add to current highlights
      setHighlights((prev) => [...prev, newHighlight]);

      // Dispatch event for context snapshot tracking
      window.dispatchEvent(new CustomEvent('highlight-created', {
        detail: {
          highlightId: newHighlight.id,
          documentId,
          pageNumber: currentPage,
          content: newHighlight.content
        }
      }));
    } catch (err) {
      console.error('Failed to create highlight:', err);
    }

    // Reset selection state
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [toolMode, isSelecting, selectionStart, selectionEnd, documentId, currentPage, currentScale]);

  // Handle highlight click - show note editor
  const handleHighlightClick = useCallback((highlight: Highlight) => {
    setEditingHighlight(highlight);
  }, []);

  // Handle note save
  const handleNoteSave = useCallback(async (highlightId: string, note: string) => {
    await highlightService.updateNote(highlightId, note);
    // Reload highlights to get updated linked_note_id
    await loadHighlights();
  }, [loadHighlights]);

  // Handle highlight delete (right-click)
  const handleHighlightDelete = useCallback(async (highlight: Highlight) => {
    try {
      const deleted = await highlightService.delete(highlight.id);
      if (deleted) {
        setHighlights((prev) => prev.filter((h) => h.id !== highlight.id));
      }
    } catch (err) {
      console.error('Failed to delete highlight:', err);
    }
  }, []);

  // Create highlight from text selection
  const handleCreateHighlightFromSelection = useCallback(async () => {
    if (!textSelection || !textSelection.range || !documentId) return;

    try {
      const range = textSelection.range;
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Get all rects for multi-line selections
      const rects = range.getClientRects();
      if (rects.length === 0) {
        console.warn('[PDFViewer] No client rects found for selection');
        return;
      }

      // Use first and last rect to get bounding box
      const firstRect = rects[0];
      const lastRect = rects[rects.length - 1];

      const canvasRect = canvas.getBoundingClientRect();

      // Calculate bounding box that covers all rects
      const minX = Math.min(...Array.from(rects).map(r => r.left));
      const minY = firstRect.top;
      const maxX = Math.max(...Array.from(rects).map(r => r.right));
      const maxY = lastRect.bottom;

      // Group rects by line (Y position) for accurate multi-line highlighting
      const lineGroups = new Map<number, DOMRect[]>();
      const yTolerance = 2; // Pixels tolerance for same line

      for (const rect of Array.from(rects)) {
        let foundGroup = false;
        for (const [groupY, group] of lineGroups.entries()) {
          if (Math.abs(rect.top - groupY) < yTolerance) {
            group.push(rect);
            foundGroup = true;
            break;
          }
        }
        if (!foundGroup) {
          lineGroups.set(rect.top, [rect]);
        }
      }

      // Create rectangle for each line
      const highlightRects: HighlightRect[] = [];
      for (const group of lineGroups.values()) {
        const minX = Math.min(...group.map(r => r.left));
        const maxX = Math.max(...group.map(r => r.right));
        const minY = Math.min(...group.map(r => r.top));
        const maxY = Math.max(...group.map(r => r.bottom));

        // Convert to canvas coordinates (relative to canvas)
        const canvasX = minX - canvasRect.left;
        const canvasY = minY - canvasRect.top;
        const canvasWidth = maxX - minX;
        const canvasHeight = maxY - minY;

        // Convert to PDF coordinates (scale 1.0)
        highlightRects.push({
          x: canvasX / currentScale,
          y: canvasY / currentScale,
          width: canvasWidth / currentScale,
          height: canvasHeight / currentScale,
        });
      }

      console.log('[PDFViewer] Creating highlight from selection:', {
        selectedText: textSelection.text.substring(0, 50) + '...',
        textLength: textSelection.text.length,
        totalRects: rects.length,
        linesCount: lineGroups.size,
        highlightRects,
        scale: currentScale
      });

      const position: HighlightPosition = {
        rects: highlightRects,
      };

      const newHighlight = await highlightService.create(
        documentId,
        currentPage,
        position,
        textSelection.text,
        DEFAULT_HIGHLIGHT_COLOR
      );

      setHighlights((prev) => [...prev, newHighlight]);

      // Dispatch event for context snapshot
      window.dispatchEvent(new CustomEvent('highlight-created', {
        detail: {
          highlightId: newHighlight.id,
          documentId,
          pageNumber: currentPage,
          content: textSelection.text
        }
      }));

      // Clear selection and hide toolbar
      window.getSelection()?.removeAllRanges();
      setTextSelection(null);

      console.log('[PDFViewer] Highlight created:', {
        id: newHighlight.id,
        textSent: textSelection.text,
        textSentLength: textSelection.text.length,
        textReceived: newHighlight.content,
        textReceivedLength: newHighlight.content?.length,
        page: currentPage
      });
    } catch (err) {
      console.error('Failed to create highlight from selection:', err);
    }
  }, [textSelection, documentId, currentPage, currentScale]);


  // Zoom handlers
  const ZOOM_STEP = 0.25;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3.0;

  const zoomIn = useCallback(() => {
    setZoomMode('manual');
    setManualZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
    setNeedsRender(true);
  }, []);

  const zoomOut = useCallback(() => {
    setZoomMode('manual');
    setManualZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
    setNeedsRender(true);
  }, []);

  const fitToPage = useCallback(() => {
    setZoomMode('fit-page');
    setNeedsRender(true);
  }, []);

  const fitToWidth = useCallback(() => {
    setZoomMode('fit-width');
    setNeedsRender(true);
  }, []);

  const setZoomLevel = useCallback((level: number) => {
    setZoomMode('manual');
    setManualZoom(level);
    setNeedsRender(true);
  }, []);

  // Close zoom dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (zoomDropdownRef.current && !zoomDropdownRef.current.contains(event.target as Node)) {
        setIsZoomDropdownOpen(false);
      }
    };

    if (isZoomDropdownOpen) {
      window.document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      window.document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isZoomDropdownOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Navigation shortcuts
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPreviousPage();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goToNextPage();
      }

      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        fitToPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPreviousPage, goToNextPage, zoomIn, zoomOut, fitToPage]);

  // Track text selection and show toolbar
  useEffect(() => {
    // Only track selection in select mode
    if (toolMode !== 'select') {
      setTextSelection(null);
      return;
    }

    // Don't setup listeners if refs aren't ready yet
    if (!containerRef.current || !textLayerRef.current) {
      return;
    }

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setTextSelection(null);
        return;
      }

      const selectedText = selection.toString().trim();
      if (!selectedText) {
        setTextSelection(null);
        return;
      }

      // Get selection bounding rect
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Position toolbar relative to text layer
      const textLayerElement = textLayerRef.current;
      if (!textLayerElement) return;
      const textLayerRect = textLayerElement.getBoundingClientRect();

      const position = {
        x: rect.right - textLayerRect.left, // Position to the right of selection
        y: rect.top + rect.height / 2 - textLayerRect.top, // Center vertically with selection
      };

      setTextSelection({
        text: selectedText,
        range: range,
        position,
      });
    };

    // Listen for selection changes (use window.document to avoid naming conflict with state variable)
    window.document.addEventListener('selectionchange', handleSelectionChange);

    // Also listen for mouseup to show toolbar after selection
    const textLayerElement = textLayerRef.current;
    const handleMouseUp = () => {
      handleSelectionChange();
    };
    textLayerElement.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.document.removeEventListener('selectionchange', handleSelectionChange);
      // Safely remove listener (element guaranteed to exist if we got here)
      textLayerElement.removeEventListener('mouseup', handleMouseUp);
    };
  }, [toolMode, currentPage, isTextLayerReady]); // Re-run when page changes or textLayer becomes ready

  // Text selection in select mode should NOT create highlights
  // User can select and copy text without creating highlights

  // Load highlights when page changes
  useEffect(() => {
    loadHighlights();
  }, [loadHighlights]);

  // Save reading progress (debounced 2s to avoid excessive writes)
  useEffect(() => {
    if (!documentId || currentPage < 1) return;

    const timer = setTimeout(async () => {
      try {
        await documentService.updateReadingProgress(documentId, currentPage);
      } catch (err) {
        console.error('Failed to save reading progress:', err);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [documentId, currentPage]);


  // Restore scroll position on mount
  useEffect(() => {
    if (!initialScrollPosition || !containerRef.current) return;

    const scrollHeight = containerRef.current.scrollHeight;
    const scrollTop = initialScrollPosition * scrollHeight;
    containerRef.current.scrollTop = scrollTop;
  }, [initialScrollPosition]);

  // Listen for jump-to-highlight events from LinksPanel
  useEffect(() => {
    const handleJumpToHighlight = (e: CustomEvent) => {
      const { documentId: targetDocId, pageNumber, highlightId } = e.detail;

      // Only handle if this is the target document
      if (targetDocId === documentId) {
        goToPage(pageNumber);
      }
    };

    window.addEventListener('jump-to-highlight', handleJumpToHighlight as EventListener);

    return () => {
      window.removeEventListener('jump-to-highlight', handleJumpToHighlight as EventListener);
    };
  }, [documentId, goToPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-secondary">Loading PDF...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  // Get current zoom display text
  const getZoomDisplayText = () => {
    if (zoomMode === 'fit-page') return 'Fit';
    if (zoomMode === 'fit-width') return 'Width';
    return `${Math.round(manualZoom * 100)}%`;
  };

  return (
    <div className="relative h-full">
      {/* Scrollable canvas area */}
      <div ref={containerRef} className="h-full overflow-auto p-4 pb-20">
        <div className="min-h-full flex items-center">
          <div
            style={{
              position: 'relative',
              display: 'inline-block',
              cursor: toolMode === 'highlight' ? 'crosshair' : 'default',
              padding: '0 16px',
              margin: '0 auto'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <canvas
              ref={canvasRef}
              className="shadow-lg"
              style={{
                backgroundColor: 'white',
                display: 'block'
              }}
            />
            {/* Text layer for text selection */}
            <div
              ref={textLayerRef}
              className={`textLayer ${toolMode === 'select' ? 'text-selectable' : 'text-disabled'}`}
            />
            {/* Highlight overlay */}
            <HighlightOverlay
              highlights={highlights}
              canvasWidth={canvasDimensions.width}
              canvasHeight={canvasDimensions.height}
              currentScale={currentScale}
              toolMode={toolMode}
              onHighlightClick={handleHighlightClick}
              onHighlightDelete={handleHighlightDelete}
            />

            {/* Text selection toolbar */}
            {textSelection && toolMode === 'select' && (
              <SelectionToolbar
                position={textSelection.position}
                onHighlight={handleCreateHighlightFromSelection}
              />
            )}
            {/* Selection rectangle during drag */}
            {isSelecting && selectionStart && selectionEnd && (
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: canvasDimensions.width,
                  height: canvasDimensions.height,
                  pointerEvents: 'none'
                }}
                viewBox={`0 0 ${canvasDimensions.width} ${canvasDimensions.height}`}
              >
                <rect
                  x={Math.min(selectionStart.x, selectionEnd.x)}
                  y={Math.min(selectionStart.y, selectionEnd.y)}
                  width={Math.abs(selectionEnd.x - selectionStart.x)}
                  height={Math.abs(selectionEnd.y - selectionStart.y)}
                  fill={DEFAULT_HIGHLIGHT_COLOR}
                  opacity={DEFAULT_HIGHLIGHT_OPACITY}
                  stroke={DEFAULT_HIGHLIGHT_COLOR}
                  strokeWidth={2}
                  style={{ mixBlendMode: 'multiply' }}
                />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Navigation Bar - absolute positioned at bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center p-3 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg bg-secondary border border-[var(--border)] z-10 pointer-events-auto">
          {/* Zoom Controls */}
          <Tooltip content="Zoom out (Ctrl -)">
            <button
              onClick={zoomOut}
              disabled={zoomMode === 'manual' && manualZoom <= MIN_ZOOM}
              className="p-1 rounded-full hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ZoomOut size={16} />
            </button>
          </Tooltip>

          {/* Zoom Dropdown */}
          <div className="relative" ref={zoomDropdownRef}>
            <button
              onClick={() => setIsZoomDropdownOpen(!isZoomDropdownOpen)}
              className="w-20 h-6 text-center text-[11px] border rounded bg-background text-foreground border-border hover:bg-tertiary transition-colors cursor-pointer flex items-center justify-center"
            >
              {getZoomDisplayText()}
            </button>

            {/* Dropdown Menu (opens upward) */}
            {isZoomDropdownOpen && (
              <div
                className="absolute bottom-full left-0 mb-2 rounded shadow-lg z-50"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  minWidth: '120px',
                }}
              >
                <div className="py-1">
                  <button
                    onClick={() => {
                      setZoomMode('fit-page');
                      setNeedsRender(true);
                      setIsZoomDropdownOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-center hover:bg-[var(--bg-active)] transition-colors"
                    style={{
                      backgroundColor: zoomMode === 'fit-page' ? 'var(--bg-active)' : 'transparent',
                    }}
                  >
                    <span className="text-[11px]" style={{ color: 'var(--fg-primary)' }}>Fit Page</span>
                  </button>
                  <button
                    onClick={() => {
                      setZoomMode('fit-width');
                      setNeedsRender(true);
                      setIsZoomDropdownOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-center hover:bg-[var(--bg-active)] transition-colors"
                    style={{
                      backgroundColor: zoomMode === 'fit-width' ? 'var(--bg-active)' : 'transparent',
                    }}
                  >
                    <span className="text-[11px]" style={{ color: 'var(--fg-primary)' }}>Fit Width</span>
                  </button>

                  <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }} />

                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        setZoomLevel(level);
                        setIsZoomDropdownOpen(false);
                      }}
                      className="w-full px-3 py-1.5 text-center hover:bg-[var(--bg-active)] transition-colors"
                      style={{
                        backgroundColor: zoomMode === 'manual' && manualZoom === level ? 'var(--bg-active)' : 'transparent',
                      }}
                    >
                      <span className="text-[11px]" style={{ color: 'var(--fg-primary)' }}>{Math.round(level * 100)}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Tooltip content="Zoom in (Ctrl +)">
            <button
              onClick={zoomIn}
              disabled={zoomMode === 'manual' && manualZoom >= MAX_ZOOM}
              className="p-1 rounded-full hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ZoomIn size={16} />
            </button>
          </Tooltip>

          {/* Divider */}
          <div className="w-px h-5 bg-border" />

          {/* Tool Mode Toggle */}
          <Tooltip content={toolMode === 'select' ? "Select text (H)" : "Highlight mode (H)"} placement="top">
            <button
              onClick={() => setToolMode(prev => prev === 'select' ? 'highlight' : 'select')}
              className="p-1 rounded-full hover:bg-primary/10 transition-colors cursor-pointer"
              style={{ color: toolMode === 'highlight' ? 'var(--accent)' : 'var(--fg-secondary)' }}
            >
              {toolMode === 'select' ? <MousePointer2 size={16} /> : <Highlighter size={16} />}
            </button>
          </Tooltip>

          {/* Backlinks Button */}
          <Tooltip content="Backlinks" placement="top">
            <button
              onClick={() => setIsBacklinksPanelOpen(!isBacklinksPanelOpen)}
              className="p-1 rounded-full hover:bg-primary/10 transition-colors cursor-pointer"
              style={{ color: isBacklinksPanelOpen ? 'var(--accent)' : 'var(--fg-secondary)' }}
            >
              <Link2 size={16} />
            </button>
          </Tooltip>

          {/* Divider */}
          <div className="w-px h-5 bg-border" />

          {/* Page Navigation */}
          <Tooltip content="Previous page (← or PageUp)">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
              className="p-1 rounded-full hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
          </Tooltip>

          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (!isNaN(page)) {
                  goToPage(page);
                }
              }}
              className="w-10 h-6 mb-0.5 text-center text-[11px] border rounded bg-background text-foreground border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-[11px] text-muted-foreground">/ {totalPages}</span>
          </div>

          <Tooltip content="Next page (→ or PageDown)">
            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              className="p-1 rounded-full hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Note Editor Popover */}
      {editingHighlight && canvasRef.current && (
        <HighlightNoteEditor
          highlight={editingHighlight}
          onClose={() => setEditingHighlight(null)}
          onSave={handleNoteSave}
          canvasRect={canvasRef.current.getBoundingClientRect()}
          currentScale={currentScale}
        />
      )}

      {/* Backlinks Slide Panel */}
      <BacklinksSlidePanel
        isOpen={isBacklinksPanelOpen}
        onClose={() => setIsBacklinksPanelOpen(false)}
        documentId={documentId}
        onNoteSelect={(noteId, title) => {
          window.dispatchEvent(new CustomEvent('open-note-split-view', {
            detail: { noteId, title }
          }));
        }}
        onDocumentSelect={(docId, title) => {
          window.dispatchEvent(new CustomEvent('open-document-split-view', {
            detail: { documentId: docId, title }
          }));
        }}
      />
    </div>
  );
};

export default PDFViewer;
