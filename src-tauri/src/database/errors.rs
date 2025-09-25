use thiserror::Error;
use serde::Serialize;
use uuid;
use sqlx;

#[derive(Error, Debug, Clone, Serialize)]
pub enum DatabaseError {
    #[error("Research session not found: {id}")]
    SessionNotFound { id: String },

    #[error("Document not found: {id}")]
    DocumentNotFound { id: String },

    #[error("Note not found: {id}")]
    NoteNotFound { id: String },

    #[error("Invalid UUID format: {value}")]
    InvalidUuid {
        value: String,
    },

    #[error("Invalid datetime format: {value}")]
    InvalidDateTime { value: String },

    #[error("Database connection failed")]
    ConnectionFailed,

    #[error("Migration failed: {reason}")]
    MigrationFailed { reason: String },

    #[error("Transaction failed: {reason}")]
    TransactionFailed { reason: String },

    #[error("Validation error: {field} - {message}")]
    ValidationError { field: String, message: String },

    #[error("Duplicate entry: {entity} with value '{value}' already exists")]
    DuplicateEntry { entity: String, value: String },

    #[error("Foreign key constraint failed: {constraint}")]
    ForeignKeyConstraint { constraint: String },

    #[error("SQL execution error: {message}")]
    SqlError { message: String },

    #[error("File system error: {message}")]
    FileSystemError { message: String },

    #[error("Internal error: {message}")]
    InternalError { message: String },
}

// Convert sqlx::Error to DatabaseError
impl From<sqlx::Error> for DatabaseError {
    fn from(error: sqlx::Error) -> Self {
        match error {
            sqlx::Error::RowNotFound => DatabaseError::InternalError {
                message: "No rows returned by query".to_string(),
            },
            sqlx::Error::Database(db_err) => {
                if let Some(code) = db_err.code() {
                    match code.as_ref() {
                        "FOREIGN_KEY_CONSTRAINT" | "787" => DatabaseError::ForeignKeyConstraint {
                            constraint: db_err.message().to_string(),
                        },
                        "UNIQUE_CONSTRAINT" | "1555" => DatabaseError::DuplicateEntry {
                            entity: "unknown".to_string(),
                            value: db_err.message().to_string(),
                        },
                        _ => DatabaseError::SqlError {
                            message: db_err.message().to_string(),
                        },
                    }
                } else {
                    DatabaseError::SqlError {
                        message: db_err.message().to_string(),
                    }
                }
            },
            _ => DatabaseError::SqlError {
                message: error.to_string(),
            },
        }
    }
}

// Convert uuid::Error to DatabaseError
impl From<uuid::Error> for DatabaseError {
    fn from(error: uuid::Error) -> Self {
        DatabaseError::InvalidUuid {
            value: error.to_string(),
        }
    }
}

// Convert to String for Tauri commands (backward compatibility)
impl From<DatabaseError> for String {
    fn from(error: DatabaseError) -> String {
        error.to_string()
    }
}

// Result type alias for convenience
pub type DatabaseResult<T> = Result<T, DatabaseError>;

// Helper functions for creating specific errors
impl DatabaseError {
    pub fn session_not_found(id: impl Into<String>) -> Self {
        DatabaseError::SessionNotFound { id: id.into() }
    }

    pub fn document_not_found(id: impl Into<String>) -> Self {
        DatabaseError::DocumentNotFound { id: id.into() }
    }

    pub fn note_not_found(id: impl Into<String>) -> Self {
        DatabaseError::NoteNotFound { id: id.into() }
    }

    pub fn validation_error(field: impl Into<String>, message: impl Into<String>) -> Self {
        DatabaseError::ValidationError {
            field: field.into(),
            message: message.into(),
        }
    }

    pub fn transaction_failed(reason: impl Into<String>) -> Self {
        DatabaseError::TransactionFailed {
            reason: reason.into(),
        }
    }

    pub fn internal_error(message: impl Into<String>) -> Self {
        DatabaseError::InternalError {
            message: message.into(),
        }
    }
}