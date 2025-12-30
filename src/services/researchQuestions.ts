import type { Note } from './notes';

export interface ResearchQuestion {
  text: string;
  sourceNoteId: string;
  sourceNoteTitle: string;
  extractedAt: string;
  isAnswered?: boolean;
}

export const researchQuestionsService = {
  /**
   * Extract research questions from notes using the algorithm from spec
   * Pattern 1: Explicit markers (TODO:, QUESTION:, Q:)
   * Pattern 2: Sentences ending with question mark
   */
  extractQuestionsFromNotes(notes: Note[]): ResearchQuestion[] {
    const allQuestions: ResearchQuestion[] = [];

    for (const note of notes) {
      const content = note.content;

      // Process line by line for better control
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines
        if (!trimmedLine) continue;

        // Pattern 1: Explicit question markers (TODO, QUESTION, Q:)
        // Match TODO/QUESTION/Q: anywhere in the line, but must be a word boundary
        const todoMatches = trimmedLine.matchAll(/\b(TODO|QUESTION|Q):\s*([^\n]+?)(?:\s*(?:TODO|QUESTION|Q):|$)/gi);
        for (const match of todoMatches) {
          const question = match[2].trim();
          // Remove wiki links from the question if present at the start
          const cleanQuestion = question.replace(/^\[\[.+?\]\]\s*/, '').trim();
          if (cleanQuestion.length > 10) {
            allQuestions.push({
              text: cleanQuestion,
              sourceNoteId: note.id,
              sourceNoteTitle: note.title,
              extractedAt: new Date().toISOString(),
              isAnswered: false,
            });
          }
        }

        // Check if line had TODO markers, if yes skip Pattern 2
        if (trimmedLine.match(/\b(?:TODO|QUESTION|Q):/i)) {
          continue;
        }

        // Pattern 2: Sentences ending with question mark
        // Skip lines with wiki links to avoid capturing link syntax
        if (trimmedLine.includes('[[')) {
          continue;
        }

        // Match sentences ending with ?
        const questionMatches = trimmedLine.match(/[^.!?]*\?/g);
        if (questionMatches) {
          for (const match of questionMatches) {
            const question = match.trim();
            if (question.length > 10) {
              allQuestions.push({
                text: question,
                sourceNoteId: note.id,
                sourceNoteTitle: note.title,
                extractedAt: new Date().toISOString(),
                isAnswered: false,
              });
            }
          }
        }
      }
    }

    // Deduplicate using Set, filter short questions, limit to most recent 10
    const uniqueQuestions = Array.from(
      new Map(allQuestions.map(q => [q.text, q])).values()
    )
      .filter(q => q.text.length > 10)
      .sort((a, b) => new Date(b.extractedAt).getTime() - new Date(a.extractedAt).getTime())
      .slice(0, 10);

    return uniqueQuestions;
  },

  /**
   * Get questions as simple string array for context snapshot
   */
  extractQuestionsAsStrings(notes: Note[]): string[] {
    return this.extractQuestionsFromNotes(notes)
      .map(q => q.text)
      .slice(0, 5); // Limit to 5 for context snapshot
  },
};
