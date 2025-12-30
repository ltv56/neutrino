import { useState } from 'react';
import { conceptService, documentService, noteService } from '@/services';
import type { Concept, CrossReference } from '@/services/concepts';
import type { Document } from '@/types';
import type { Note } from '@/services/notes';

const ConceptsDebug = () => {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [crossRefs, setCrossRefs] = useState<CrossReference[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Form states
  const [conceptName, setConceptName] = useState('');
  const [conceptDesc, setConceptDesc] = useState('');
  const [conceptDomain, setConceptDomain] = useState('');
  const [selectedConceptId, setSelectedConceptId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [noteId, setNoteId] = useState('');
  const [relationship, setRelationship] = useState('discusses');

  const loadConcepts = async () => {
    setLoading(true);
    try {
      const data = await conceptService.getAllConcepts();
      setConcepts(data);
      setMessage(`Loaded ${data.length} concepts`);
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await documentService.getAll();
      setDocuments(data);
      setMessage(`Loaded ${data.length} documents`);
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await noteService.getAll();
      setNotes(data);
      setMessage(`Loaded ${data.length} notes`);
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const createConcept = async () => {
    if (!conceptName) {
      setMessage('Concept name is required');
      return;
    }

    setLoading(true);
    try {
      const concept = await conceptService.createConcept(
        conceptName,
        conceptDesc || undefined,
        conceptDomain || undefined
      );
      setMessage(`Created concept: ${concept.name} (ID: ${concept.id})`);
      setSelectedConceptId(concept.id);
      loadConcepts();
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const linkToDocument = async () => {
    if (!selectedConceptId || !documentId) {
      setMessage('Concept ID and Document ID are required');
      return;
    }

    setLoading(true);
    try {
      await conceptService.linkConceptToDocument(
        selectedConceptId,
        documentId,
        relationship,
        1.0
      );
      setMessage(`Linked concept to document`);
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const linkToNote = async () => {
    if (!selectedConceptId || !noteId) {
      setMessage('Concept ID and Note ID are required');
      return;
    }

    setLoading(true);
    try {
      await conceptService.linkConceptToNote(
        selectedConceptId,
        noteId,
        relationship,
        1.0
      );
      setMessage(`Linked concept to note`);
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const getCrossRefs = async () => {
    if (!documentId) {
      setMessage('Document ID is required');
      return;
    }

    setLoading(true);
    try {
      const refs = await conceptService.getCrossReferences(documentId);
      setCrossRefs(refs);
      setMessage(`Found ${refs.length} cross-references`);
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl bg-gray-900 text-gray-100 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold text-white">Concepts Debug Panel</h1>

      {/* Message */}
      {message && (
        <div className="p-2 bg-blue-900 rounded text-sm text-blue-100">
          {message}
        </div>
      )}

      {/* Create Concept */}
      <div className="border border-gray-700 rounded p-4 space-y-2 bg-gray-800">
        <h2 className="font-semibold text-white">1. Create Concept</h2>
        <input
          type="text"
          placeholder="Concept Name (e.g., Machine Learning)"
          value={conceptName}
          onChange={(e) => setConceptName(e.target.value)}
          className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={conceptDesc}
          onChange={(e) => setConceptDesc(e.target.value)}
          className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
        />
        <input
          type="text"
          placeholder="Domain (e.g., AI, ML, NLP)"
          value={conceptDomain}
          onChange={(e) => setConceptDomain(e.target.value)}
          className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
        />
        <button
          onClick={createConcept}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Create Concept
        </button>
      </div>

      {/* List Concepts */}
      <div className="border border-gray-700 rounded p-4 space-y-2 bg-gray-800">
        <h2 className="font-semibold text-white">2. All Concepts</h2>
        <button
          onClick={loadConcepts}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Load Concepts
        </button>
        {concepts.length > 0 && (
          <div className="space-y-2 mt-2">
            {concepts.map((concept) => (
              <div
                key={concept.id}
                className={`p-2 border border-gray-600 rounded cursor-pointer ${
                  selectedConceptId === concept.id ? 'bg-blue-900' : 'bg-gray-700'
                }`}
                onClick={() => setSelectedConceptId(concept.id)}
              >
                <div className="font-medium text-white">{concept.name}</div>
                <div className="text-sm text-gray-400">
                  ID: {concept.id} | Domain: {concept.domain || 'N/A'}
                </div>
                {concept.description && (
                  <div className="text-sm text-gray-300">{concept.description}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* List Documents */}
      <div className="border border-gray-700 rounded p-4 space-y-2 bg-gray-800">
        <h2 className="font-semibold text-white">3. All Documents</h2>
        <button
          onClick={loadDocuments}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Load Documents
        </button>
        {documents.length > 0 && (
          <div className="space-y-2 mt-2 max-h-64 overflow-y-auto">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`p-2 border border-gray-600 rounded cursor-pointer ${
                  documentId === doc.id ? 'bg-blue-900' : 'bg-gray-700'
                }`}
                onClick={() => setDocumentId(doc.id)}
              >
                <div className="font-medium text-white">{doc.title}</div>
                <div className="text-sm text-gray-400">
                  ID: {doc.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* List Notes */}
      <div className="border border-gray-700 rounded p-4 space-y-2 bg-gray-800">
        <h2 className="font-semibold text-white">4. All Notes</h2>
        <button
          onClick={loadNotes}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Load Notes
        </button>
        {notes.length > 0 && (
          <div className="space-y-2 mt-2 max-h-64 overflow-y-auto">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`p-2 border border-gray-600 rounded cursor-pointer ${
                  noteId === note.id ? 'bg-blue-900' : 'bg-gray-700'
                }`}
                onClick={() => setNoteId(note.id)}
              >
                <div className="font-medium text-white">{note.title}</div>
                <div className="text-sm text-gray-400">
                  ID: {note.id}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {note.content.substring(0, 100)}...
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Link to Document */}
      <div className="border border-gray-700 rounded p-4 space-y-2 bg-gray-800">
        <h2 className="font-semibold text-white">5. Link to Document</h2>
        <input
          type="text"
          placeholder="Selected Concept ID"
          value={selectedConceptId}
          onChange={(e) => setSelectedConceptId(e.target.value)}
          className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
        />
        <input
          type="text"
          placeholder="Document ID (get from URL or DevTools)"
          value={documentId}
          onChange={(e) => setDocumentId(e.target.value)}
          className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
        />
        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
        >
          <option value="discusses">Discusses</option>
          <option value="defines">Defines</option>
          <option value="uses">Uses</option>
          <option value="extends">Extends</option>
          <option value="contradicts">Contradicts</option>
        </select>
        <button
          onClick={linkToDocument}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Link to Document
        </button>
      </div>

      {/* Link to Note */}
      <div className="border border-gray-700 rounded p-4 space-y-2 bg-gray-800">
        <h2 className="font-semibold text-white">6. Link to Note</h2>
        <input
          type="text"
          placeholder="Note ID"
          value={noteId}
          onChange={(e) => setNoteId(e.target.value)}
          className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
        />
        <button
          onClick={linkToNote}
          disabled={loading}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
        >
          Link to Note
        </button>
      </div>

      {/* Get Cross References */}
      <div className="border border-gray-700 rounded p-4 space-y-2 bg-gray-800">
        <h2 className="font-semibold text-white">7. Get Cross References</h2>
        <button
          onClick={getCrossRefs}
          disabled={loading}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
        >
          Get Cross References for Document
        </button>
        {crossRefs.length > 0 && (
          <div className="space-y-2 mt-2">
            {crossRefs.map((ref, idx) => (
              <div key={idx} className="p-2 border border-gray-600 rounded bg-gray-700">
                <div className="font-medium text-white">{ref.concept_name}</div>
                <div className="text-sm text-gray-300">
                  Confidence: {(ref.confidence * 100).toFixed(0)}%
                </div>
                {ref.documents.length > 0 && (
                  <div className="mt-1">
                    <div className="text-sm font-medium text-white">Related Documents:</div>
                    {ref.documents.map((doc, i) => (
                      <div key={i} className="text-sm ml-2 text-gray-300">
                        • {doc.document_title} ({doc.relationship})
                      </div>
                    ))}
                  </div>
                )}
                {ref.notes.length > 0 && (
                  <div className="mt-1">
                    <div className="text-sm font-medium text-white">Related Notes:</div>
                    {ref.notes.map((note, i) => (
                      <div key={i} className="text-sm ml-2 text-gray-300">
                        • {note.note_title} ({note.relationship})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConceptsDebug;
