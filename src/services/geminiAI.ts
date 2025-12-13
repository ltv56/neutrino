import { invoke } from '@tauri-apps/api/core';
import type {
  ContextSnapshot,
  AIInsights,
} from '@/types';

export const geminiAIService = {
  async analyzeSession(snapshot: ContextSnapshot): Promise<AIInsights> {
    try {
      const prompt = this.buildAnalysisPrompt(snapshot);
      const response = await this.callGeminiAPI(prompt);

      console.log('[GeminiAI] Raw response from Gemini:', response);
      return this.parseGeminiResponse(response);
    } catch (error) {
      console.error('[GeminiAI] Analysis failed:', error);
      return this.generateFallbackInsights(snapshot);
    }
  },

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await invoke<string>('test_gemini_connection');
      return { success: true, message: result };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      };
    }
  },

  buildAnalysisPrompt(snapshot: ContextSnapshot): string {
    const {
      session_goal,
      last_document,
      last_highlight,
      last_note,
      research_questions,
      reading_behavior,
      struggle_signals,
      session_statistics,
    } = snapshot;

    const parts: string[] = [
      'You are an AI research assistant analyzing a researcher\'s session. Provide brief, actionable insights.',
      '',
      '## Session Context',
    ];

    if (session_goal) {
      parts.push(`Goal: ${session_goal}`);
    }

    if (last_document) {
      parts.push(
        `Currently reading: "${last_document.document_title}" (Page ${last_document.page_number})`
      );
    }

    if (reading_behavior) {
      const mins = Math.floor(reading_behavior.total_reading_time_ms / 60000);
      parts.push(`\nReading time: ${mins} minutes`);

      if (reading_behavior.current_page_time_ms) {
        const pageMins = Math.floor(
          reading_behavior.current_page_time_ms / 60000
        );
        if (pageMins > 5) {
          parts.push(
            `Time on current page: ${pageMins} min (potential struggle)`
          );
        }
      }
    }

    if (struggle_signals) {
      parts.push('\n## Struggle Signals');

      if (struggle_signals.highlights_without_notes > 3) {
        parts.push(
          `- ${struggle_signals.highlights_without_notes} highlights without notes (possible confusion)`
        );
      }

      if (struggle_signals.slow_progress) {
        parts.push('- Slow reading progress on current page');
      }

      if (struggle_signals.rapid_highlighting) {
        parts.push('- Rapid highlighting (possible information overload)');
      }

      if (struggle_signals.re_reading_detected) {
        parts.push('- Re-reading previous sections');
      }
    }

    if (session_statistics) {
      parts.push('\n## Session Statistics');
      parts.push(`- Documents opened: ${session_statistics.documents_opened_count}`);
      parts.push(`- Highlights created: ${session_statistics.highlights_created_count}`);
      parts.push(`- Notes created: ${session_statistics.notes_created_count}`);

      if (
        session_statistics.highlight_note_ratio !== undefined &&
        session_statistics.highlight_note_ratio < 0.3
      ) {
        parts.push(
          `- Low note-taking rate: ${(session_statistics.highlight_note_ratio * 100).toFixed(0)}% (may indicate passive reading)`
        );
      }
    }

    if (last_highlight && last_highlight.content) {
      parts.push(`\nLast highlight: "${last_highlight.content.substring(0, 100)}..."`);
      if (!last_highlight.note) {
        parts.push('(No note added - may need clarification)');
      }
    }

    if (research_questions && research_questions.length > 0) {
      parts.push('\n## Open Questions');
      research_questions.forEach((q, i) => {
        if (i < 3) parts.push(`- ${q}`);
      });
    }

    parts.push(
      '\n## Task',
      'Analyze this session and provide:',
      '1. A brief 1-sentence summary of what the researcher was doing',
      '2. 2-3 specific areas where they might be struggling',
      '3. 2-3 actionable suggestions for next steps',
      '4. Their apparent learning pattern (e.g., "visual learner", "needs examples", "prefers depth-first")',
      '',
      'CRITICAL FORMATTING RULES:',
      '- Return ONLY valid JSON, no markdown blocks, no explanations',
      '- Use ONLY straight quotes ("), not curly quotes',
      '- Keep strings SHORT (max 80 chars each)',
      '- Do NOT include newlines inside strings',
      '- Escape any quotes inside strings with backslash',
      '- Ensure all strings are properly closed',
      '',
      'Required JSON format:',
      '{',
      '  "summary": "short one-line summary",',
      '  "struggle_areas": ["brief area 1", "brief area 2"],',
      '  "suggestions": ["short suggestion 1", "short suggestion 2"],',
      '  "learning_pattern": "brief pattern"',
      '}',
    );

    return parts.join('\n');
  },

  async callGeminiAPI(prompt: string): Promise<string> {
    return await invoke<string>('call_gemini_api', { prompt });
  },

  parseGeminiResponse(responseText: string): AIInsights {
    try {
      console.log('[GeminiAI] Raw response text:', responseText);
      console.log('[GeminiAI] Response length:', responseText.length);

      // Remove markdown code blocks if present (```json ... ``` or ``` ... ```)
      let cleanedText = responseText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      // Extract JSON object - use greedy match to get complete object
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[GeminiAI] No JSON object found in response');
        throw new Error('No JSON object found');
      }

      const jsonText = jsonMatch[0];
      console.log('[GeminiAI] Extracted JSON text:', jsonText);

      // Try to fix common JSON issues
      let fixedJson = jsonText;

      // Check if string seems truncated (no closing brace)
      const openBraces = (fixedJson.match(/\{/g) || []).length;
      const closeBraces = (fixedJson.match(/\}/g) || []).length;

      if (openBraces !== closeBraces) {
        console.warn('[GeminiAI] Mismatched braces - attempting to fix');
        // Add missing closing braces
        fixedJson += '}'.repeat(openBraces - closeBraces);
      }

      // Check for unterminated strings (common issue)
      // If last quote before } is unmatched, close it
      const beforeClosing = fixedJson.substring(0, fixedJson.lastIndexOf('}'));
      const quotes = (beforeClosing.match(/"/g) || []).length;
      if (quotes % 2 !== 0) {
        console.warn('[GeminiAI] Unterminated string detected - attempting to fix');
        // Insert closing quote before last }
        const lastBrace = fixedJson.lastIndexOf('}');
        fixedJson = fixedJson.substring(0, lastBrace) + '"' + fixedJson.substring(lastBrace);
      }

      console.log('[GeminiAI] Fixed JSON text:', fixedJson);

      const parsed = JSON.parse(fixedJson);

      return {
        generated_at: new Date().toISOString(),
        summary: parsed.summary,
        struggle_areas: parsed.struggle_areas || [],
        suggestions: parsed.suggestions || [],
        learning_pattern: parsed.learning_pattern,
      };
    } catch (error) {
      console.error('[GeminiAI] Failed to parse response:', error);
      console.error('[GeminiAI] Original response:', responseText);

      // Return fallback with partial data if possible
      return {
        generated_at: new Date().toISOString(),
        summary: 'Unable to analyze session (parsing error)',
        suggestions: ['Continue reading', 'Take notes'],
        struggle_areas: ['AI analysis temporarily unavailable'],
      };
    }
  },

  generateFallbackInsights(snapshot: ContextSnapshot): AIInsights {
    const suggestions: string[] = [];
    const struggleAreas: string[] = [];

    if (snapshot.last_document) {
      suggestions.push(
        `Continue reading "${snapshot.last_document.document_title}" from page ${snapshot.last_document.page_number}`
      );
    }

    if (snapshot.struggle_signals?.highlights_without_notes > 3) {
      struggleAreas.push('Many highlights without notes - may indicate confusion');
      suggestions.push('Review highlights and add notes to clarify understanding');
    }

    if (snapshot.struggle_signals?.slow_progress) {
      struggleAreas.push('Slow progress on current page');
      suggestions.push(
        'Try: Read simpler introduction first, or watch explanatory video'
      );
    }

    if (snapshot.research_questions && snapshot.research_questions.length > 0) {
      suggestions.push(`Address open question: ${snapshot.research_questions[0]}`);
    }

    return {
      generated_at: new Date().toISOString(),
      summary: snapshot.last_document
        ? `Reading ${snapshot.last_document.document_title}`
        : 'Research in progress',
      struggle_areas: struggleAreas.length > 0 ? struggleAreas : undefined,
      suggestions:
        suggestions.length > 0
          ? suggestions
          : ['Continue your research', 'Take notes as you read'],
      learning_pattern: undefined,
    };
  },
};
