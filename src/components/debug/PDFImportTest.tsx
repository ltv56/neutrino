import { useState } from 'react';
import { pdfService, documentService } from '@/services';
import { useSessionsContext } from '@/hooks/sessions';
import PDFDropZone from '@/components/pdf/PDFDropZone';
import type { Document } from '@/types';

const PDFImportTest = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [showDropZone, setShowDropZone] = useState(false);
  const { currentSession } = useSessionsContext();

  const handlePDFImported = (document: Document) => {
    setResult(
      `✅ PDF imported via drag & drop!\n` +
      `ID: ${document.id}\n` +
      `Title: ${document.title}\n` +
      `Path: ${document.file_path}`
    );
  };

  const testDragDrop = async () => {
    setShowDropZone(!showDropZone);
    if (!showDropZone) {
      setResult('📝 Drop zone activated! Drag & drop PDF files anywhere on the window.');
    }
  };

  const testFileBrowser = async () => {
    setLoading(true);
    try {
      const selected = await pdfService.openFilePicker(true);

      if (!selected) {
        setResult('❌ No file selected');
        setLoading(false);
        return;
      }

      const paths = Array.isArray(selected) ? selected : [selected];
      const results: string[] = [];

      for (const sourcePath of paths) {
        try {
          const savedInfo = await pdfService.importFromPath(sourcePath);
          const metadata = await pdfService.extractMetadata(savedInfo.path);
          const fileName = sourcePath.split(/[\\/]/).pop() || 'document.pdf';

          results.push(
            `✅ ${fileName}\n` +
            `   Path: ${savedInfo.path}\n` +
            `   Size: ${(savedInfo.size / 1024).toFixed(2)} KB\n` +
            `   Title: ${metadata.title || 'N/A'}\n` +
            `   Author: ${metadata.author || 'N/A'}\n` +
            `   Pages: ${metadata.page_count}`
          );
        } catch (err) {
          results.push(`❌ Failed: ${sourcePath}\n   Error: ${err}`);
        }
      }

      setResult(results.join('\n\n'));
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testMultipleFiles = async () => {
    setLoading(true);
    try {
      const selected = await pdfService.openFilePicker(true);

      if (!selected) {
        setResult('❌ No files selected');
        setLoading(false);
        return;
      }

      const paths = Array.isArray(selected) ? selected : [selected];

      setResult(
        `📊 Selected ${paths.length} file(s):\n` +
        paths.map((p, i) => `${i + 1}. ${p.split(/[\\/]/).pop()}`).join('\n') +
        `\n\n⏳ Importing...`
      );

      let successCount = 0;
      let errorCount = 0;

      for (const sourcePath of paths) {
        try {
          const savedInfo = await pdfService.importFromPath(sourcePath);
          await pdfService.extractMetadata(savedInfo.path);
          successCount++;
        } catch {
          errorCount++;
        }
      }

      setResult(
        `📊 Import Complete:\n` +
        `✅ Success: ${successCount}\n` +
        `❌ Failed: ${errorCount}`
      );
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testWithSession = async () => {
    setLoading(true);
    try {
      // Use current session from global state
      if (!currentSession) {
        setResult('❌ No session selected. Please select a session in the title bar first.');
        setLoading(false);
        return;
      }

      const selected = await pdfService.openFilePicker(false);

      if (!selected || Array.isArray(selected)) {
        setResult('❌ No file selected');
        setLoading(false);
        return;
      }

      const { document } = await documentService.importPDF(selected, currentSession.id);

      setResult(
        `✅ Document imported and linked to current session!\n` +
        `Document ID: ${document.id}\n` +
        `Session Title: ${currentSession.title}\n` +
        `Document Title: ${document.title}\n` +
        `File Path: ${document.file_path}`
      );
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testWithoutSession = async () => {
    setLoading(true);
    try {
      const selected = await pdfService.openFilePicker(false);

      if (!selected || Array.isArray(selected)) {
        setResult('❌ No file selected');
        setLoading(false);
        return;
      }

      const { document } = await documentService.importPDF(selected);

      setResult(
        `✅ Document created (not linked to any session)!\n` +
        `ID: ${document.id}\n` +
        `Title: ${document.title}\n` +
        `Path: ${document.file_path}`
      );
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const testMetadataOnly = async () => {
    setLoading(true);
    try {
      const selected = await pdfService.openFilePicker(false);

      if (!selected || Array.isArray(selected)) {
        setResult('❌ No file selected');
        setLoading(false);
        return;
      }

      const savedInfo = await pdfService.importFromPath(selected);
      const metadata = await pdfService.extractMetadata(savedInfo.path);

      setResult(
        `📄 PDF Metadata:\n` +
        `Title: ${metadata.title || 'N/A'}\n` +
        `Author: ${metadata.author || 'N/A'}\n` +
        `Pages: ${metadata.page_count}\n` +
        `Created: ${metadata.created_date || 'N/A'}\n` +
        `Modified: ${metadata.modified_date || 'N/A'}\n\n` +
        `File Path: ${savedInfo.path}\n` +
        `File Size: ${(savedInfo.size / 1024).toFixed(2)} KB`
      );
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const clearTestData = async () => {
    if (!confirm('⚠️ This will delete ALL documents from the database. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      const deletedCount = await documentService.deleteAll();
      setResult(
        `🗑️ Cleared Test Data:\n` +
        `Deleted ${deletedCount} document(s) from database`
      );
    } catch (error) {
      setResult(`❌ Error clearing data: ${error}`);
    }
    setLoading(false);
  };

  return (
    <div className="p-4">
      <div className="space-y-2 mb-4">
        <button
          onClick={testFileBrowser}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '📁'} Test: File Browser Import
        </button>

        <button
          onClick={testMultipleFiles}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '📚'} Test: Multiple Files
        </button>

        <button
          onClick={testWithSession}
          disabled={loading || !currentSession}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '✅'} Test: With Current Session {currentSession && `(${currentSession.title})`}
        </button>

        <button
          onClick={testWithoutSession}
          disabled={loading}
          className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '⚠️'} Test: Without Session
        </button>

        <button
          onClick={testMetadataOnly}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '📊'} Test: Metadata Extract
        </button>

        <button
          onClick={testDragDrop}
          disabled={loading}
          className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          📝 Test: Drag & Drop
        </button>

        <button
          onClick={clearTestData}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          {loading ? '⏳' : '🗑️'} Clear Test Data
        </button>
      </div>

      {result && (
        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
          {result}
        </div>
      )}

      {showDropZone && (
        <div className="mt-4">
          <PDFDropZone
            sessionId={currentSession?.id}
            onPDFImported={handlePDFImported}
          />
        </div>
      )}
    </div>
  );
};

export default PDFImportTest;
