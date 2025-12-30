import { useState, useEffect } from 'react';
import { GitBranch, ChevronDown, ChevronRight, FileText, StickyNote } from 'lucide-react';
import { conceptService } from '@/services';
import type { CrossReference } from '@/services/concepts';

interface CrossReferencesPanelProps {
  documentId?: string;
  onNavigateToDocument?: (documentId: string, title: string) => void;
  onNavigateToNote?: (noteId: string) => void;
}

const CrossReferencesPanel: React.FC<CrossReferencesPanelProps> = ({
  documentId,
  onNavigateToDocument,
  onNavigateToNote,
}) => {
  const [crossRefs, setCrossRefs] = useState<CrossReference[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCrossReferences = async () => {
      if (!documentId) {
        setCrossRefs([]);
        return;
      }

      setLoading(true);
      try {
        const refs = await conceptService.getCrossReferences(documentId);
        setCrossRefs(refs);
      } catch (error) {
        console.error('Failed to load cross-references:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCrossReferences();
  }, [documentId]);

  if (!documentId) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-blue-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Cross-References
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({crossRefs.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-gray-500" />
        ) : (
          <ChevronRight size={16} className="text-gray-500" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 pb-3">
          {loading ? (
            <div className="text-xs text-gray-500 dark:text-gray-400 py-2">
              Loading cross-references...
            </div>
          ) : crossRefs.length === 0 ? (
            <div className="text-xs text-gray-500 dark:text-gray-400 py-2">
              No cross-references found. Concepts connect related documents and notes.
            </div>
          ) : (
            <div className="space-y-3">
              {crossRefs.map((ref, index) => (
                <div
                  key={`${ref.concept_name}-${index}`}
                  className="p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  {/* Concept Name */}
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch size={14} className="text-blue-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {ref.concept_name}
                    </span>
                    {ref.confidence < 1.0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({Math.round(ref.confidence * 100)}% confidence)
                      </span>
                    )}
                  </div>

                  {/* Related Documents */}
                  {ref.documents.length > 0 && (
                    <div className="ml-6 mb-2">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Documents:
                      </div>
                      <div className="space-y-1">
                        {ref.documents.map((doc) => (
                          <button
                            key={doc.document_id}
                            onClick={() => onNavigateToDocument?.(doc.document_id, doc.document_title)}
                            className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline w-full text-left"
                          >
                            <FileText size={12} className="flex-shrink-0" />
                            <span className="truncate">{doc.document_title}</span>
                            <span className="text-gray-500 dark:text-gray-400 text-[10px]">
                              ({doc.relationship})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related Notes */}
                  {ref.notes.length > 0 && (
                    <div className="ml-6">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Notes:
                      </div>
                      <div className="space-y-1">
                        {ref.notes.map((note) => (
                          <button
                            key={note.note_id}
                            onClick={() => onNavigateToNote?.(note.note_id)}
                            className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 hover:underline w-full text-left"
                          >
                            <StickyNote size={12} className="flex-shrink-0" />
                            <span className="truncate">{note.note_title}</span>
                            <span className="text-gray-500 dark:text-gray-400 text-[10px]">
                              ({note.relationship})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {crossRefs.length > 0 && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Tip: Concepts are automatically discovered from your research or can be created manually
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CrossReferencesPanel;
