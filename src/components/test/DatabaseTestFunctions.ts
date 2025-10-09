import { invoke } from '@tauri-apps/api/core';

export interface ResearchSession {
  id: string;
  title: string;
  goal?: string;
  phase: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  session_id: string;
  title: string;
  file_path: string;
  content_type: string;
  metadata?: Record<string, unknown> | null;
  reading_progress: number;
  created_at: string;
  updated_at: string;
}

export class DatabaseTester {
  async createSession(title: string, goal?: string): Promise<ResearchSession> {
    return await invoke('create_research_session', { title, goal });
  }

  async getSessions(): Promise<ResearchSession[]> {
    return await invoke('get_research_sessions');
  }

  async createDocument(
    sessionId: string,
    title: string,
    filePath: string,
    contentType: string
  ): Promise<Document> {
    console.log('Calling create_document with:', {
      session_id: sessionId,
      title,
      file_path: filePath,
      content_type: contentType,
    });

    return await invoke('create_document', {
      sessionId: sessionId,
      title,
      filePath: filePath,
      contentType: contentType,
    });
  }

  async createSessionWithDocuments(
    title: string,
    goal: string | undefined,
    documents: Array<{ title: string; file_path: string; content_type: string }>
  ) {
    return await invoke('create_session_with_documents', {
      title,
      goal,
      documents,
    });
  }

  async runQuickTest(): Promise<string> {
    try {
      // Test 1: Create session
      const session = await this.createSession(
        'Quick Test Session',
        'Testing all functions'
      );

      // Test 2: Get sessions
      const sessions = await this.getSessions();

      // Test 3: Create document
      console.log('About to call createDocument with session.id:', session.id);
      try {
        const document = await this.createDocument(
          session.id,
          'Test Document',
          '/test/path/doc.pdf',
          'application/pdf'
        );
        console.log('createDocument returned:', document);
      } catch (error) {
        console.error('createDocument failed:', error);
        throw error;
      }

      return (
        `✅ All tests passed!\n` +
        `- Created session: ${session.title}\n` +
        `- Found ${sessions.length} total sessions\n` +
        `- Created document: ${document.title}`
      );
    } catch (error) {
      return `❌ Test failed: ${error}`;
    }
  }
}
