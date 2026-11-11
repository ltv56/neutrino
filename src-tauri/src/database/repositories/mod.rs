mod session;
mod document;
mod note;
mod reading_event;
mod session_document;
mod note_link;
mod folder;
mod document_page;

pub use session::SessionRepository;
pub use document::DocumentRepository;
pub use note::NoteRepository;
pub use reading_event::ReadingEventRepository;
pub use session_document::SessionDocumentRepository;
pub use note_link::NoteLinkRepository;
pub use folder::FolderRepository;
pub use document_page::{DocumentPageRepository, PageHit, PageText};

// Re-export common types
pub(crate) use super::errors::DatabaseError;
pub(crate) type DbResult<T> = Result<T, DatabaseError>;
