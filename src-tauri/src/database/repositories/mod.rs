mod session;
mod document;
mod note;
mod reading_event;
mod session_document;
mod note_link;

pub use session::SessionRepository;
pub use document::DocumentRepository;
pub use note::NoteRepository;
pub use reading_event::ReadingEventRepository;
pub use session_document::SessionDocumentRepository;
pub use note_link::NoteLinkRepository;

// Re-export common types
pub(crate) use super::errors::DatabaseError;
pub(crate) type DbResult<T> = Result<T, DatabaseError>;
