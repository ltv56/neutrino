/// Documents module - Domain layer for document management
///
/// This module handles all document-related business logic including:
/// - File storage operations (saving, reading, deleting files)
/// - Format-specific handlers (PDF, EPUB, etc.)
/// - Document metadata extraction

pub mod storage;
pub mod pdf;
