import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { PDFMetadata } from '@/types';

export interface SavedFileInfo {
  path: string;
  size: number;
}

/**
 * PDF Service - File System Layer
 * Handles physical file operations and PDF processing only.
 * Does NOT interact with database.
 */
export const pdfService = {
  /**
   * Save file bytes to app storage
   */
  async saveFile(fileName: string, fileData: number[]): Promise<SavedFileInfo> {
    return await invoke('pdf_save_file', { fileName, fileData });
  },

  /**
   * Import file from source path to app storage
   */
  async importFromPath(sourcePath: string): Promise<SavedFileInfo> {
    return await invoke('pdf_import_from_path', { sourcePath });
  },

  /**
   * Port of this instance's local PDF server
   */
  async getServerPort(): Promise<number> {
    return await invoke<number>('get_http_server_port');
  },

  /**
   * Read file from storage (returns bytes)
   */
  async readFile(filePath: string): Promise<number[]> {
    return await invoke('pdf_read_file', { filePath });
  },

  /**
   * Delete physical file from storage
   */
  async deleteFile(filePath: string): Promise<void> {
    return await invoke('pdf_delete_file', { filePath });
  },

  /**
   * Extract metadata from PDF file
   */
  async extractMetadata(filePath: string): Promise<PDFMetadata> {
    return await invoke('pdf_extract_metadata', { filePath });
  },

  /**
   * Open file picker dialog
   */
  async openFilePicker(multiple: boolean = false): Promise<string | string[] | null> {
    return await open({
      multiple,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
  },

  /**
   * Get filename from path
   */
  getFileName(path: string): string {
    return path.split(/[\\/]/).pop() || 'document.pdf';
  },
};
