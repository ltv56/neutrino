mod session;
mod document;
mod note;
mod reading_event;

pub use session::SessionRepository;
pub use document::DocumentRepository;
pub use note::NoteRepository;
pub use reading_event::ReadingEventRepository;

// Re-export common types
pub(crate) use super::errors::DatabaseError;
pub(crate) type DbResult<T> = Result<T, DatabaseError>;
