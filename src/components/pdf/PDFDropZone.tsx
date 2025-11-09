import React, { useState, useCallback, useEffect } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import type { Document } from '@/types';
import { documentService } from '@/services';

interface PDFDropZoneProps {
  sessionId?: string;
  onPDFImported?: (document: Document) => void;
  className?: string;
}

export const PDFDropZone: React.FC<PDFDropZoneProps> = ({
  sessionId,
  onPDFImported,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  // Process file paths from drag & drop or file browser
  const processFilePaths = useCallback(async (paths: string[]) => {
    setIsUploading(true);
    setError(null);
    const imported: string[] = [];

    try {
      // Filter PDF files only
      const pdfPaths = paths.filter((path) => path.toLowerCase().endsWith('.pdf'));

      if (pdfPaths.length === 0) {
        setError('No PDF files found. Please drop PDF files only.');
        setIsUploading(false);
        return;
      }

      for (const sourcePath of pdfPaths) {
        const fileName = sourcePath.split(/[\\/]/).pop() || 'document.pdf';

        try {
          // Complete import workflow: file + metadata + database + duplicate check
          const { document } = await documentService.importPDF(
            sourcePath,
            sessionId || null
          );

          imported.push(fileName);

          // Callback
          if (onPDFImported) {
            onPDFImported(document);
          }
        } catch (err) {
          const errorMessage = String(err);
          console.error(`Failed to import ${fileName}:`, err);

          // Show user-friendly error for duplicates
          if (errorMessage.includes('Duplicate document')) {
            setError(`Duplicate file: ${fileName} already exists in database`);
          } else {
            setError(`Failed to import ${fileName}: ${errorMessage}`);
          }
        }
      }

      setUploadedFiles(imported);

      // Clear success message after 3 seconds
      if (imported.length > 0) {
        setTimeout(() => setUploadedFiles([]), 3000);
      }
    } catch (err) {
      setError(`Import failed: ${err}`);
      console.error('Import error:', err);
    } finally {
      setIsUploading(false);
    }
  }, [sessionId, onPDFImported]);

  // Tauri drag & drop event listener
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unlisten = await getCurrentWebview().onDragDropEvent((event) => {
          const payload = event.payload as {
            type: string;
            paths?: string[];
            position?: { x: number; y: number }
          };

          if (payload.type === 'enter' || payload.type === 'over') {
            setIsDragging(true);
          } else if (payload.type === 'drop') {
            setIsDragging(false);
            if (payload.paths && payload.paths.length > 0) {
              processFilePaths(payload.paths);
            }
          } else if (payload.type === 'leave' || payload.type === 'cancel') {
            setIsDragging(false);
          }
        });
      } catch (err) {
        console.error('Failed to setup drag & drop listener:', err);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [processFilePaths]);

  const handleBrowseClick = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'PDF',
            extensions: ['pdf'],
          },
        ],
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        await processFilePaths(paths);
      }
    } catch (err) {
      setError(`Failed to open file dialog: ${err}`);
      console.error('File dialog error:', err);
    }
  }, [processFilePaths]);

  return (
    <div className={`pdf-drop-zone ${className}`}>
      <div
        className={`
          border-2 border-dashed rounded-lg p-12 transition-all cursor-pointer relative
          ${isDragging
            ? 'border-[var(--accent)] bg-[var(--accent)]/20 scale-105'
            : 'border-[var(--border)] hover:border-[var(--accent)]/50'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onClick={handleBrowseClick}
      >
        {/* Drag overlay inside dropzone */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <FileText size={64} style={{ color: 'var(--accent)' }} className="mx-auto mb-3 animate-pulse" />
              <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                Drop PDF files here
              </p>
            </div>
          </div>
        )}

        <div className={`flex flex-col items-center justify-center gap-4 ${isDragging ? 'opacity-30' : ''}`}>
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]" />
              <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                Importing PDF files...
              </p>
            </>
          ) : (
            <>
              <div
                className="p-4 rounded-full"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <Upload size={32} style={{ color: 'var(--fg-tertiary)' }} />
              </div>

              <div className="text-center">
                <p
                  className="text-base font-medium mb-1"
                  style={{ color: 'var(--fg-primary)' }}
                >
                  Drop PDF files here
                </p>
                <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                  or click to browse
                </p>
              </div>

              <p className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>
                Supports multiple files
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="mt-4 p-3 rounded-lg flex items-start gap-2"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid #ef4444',
          }}
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" color="#ef4444" />
          <p className="text-sm" style={{ color: '#ef4444' }}>
            {error}
          </p>
        </div>
      )}

      {/* Success message */}
      {uploadedFiles.length > 0 && (
        <div
          className="mt-4 p-3 rounded-lg"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid #10b981',
          }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: '#10b981' }}>
            Successfully imported {uploadedFiles.length} file(s):
          </p>
          <ul className="text-xs space-y-1" style={{ color: 'var(--fg-secondary)' }}>
            {uploadedFiles.map((name, idx) => (
              <li key={idx}>• {name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PDFDropZone;
