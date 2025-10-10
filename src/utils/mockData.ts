import { databaseService } from '@/services/database';

interface MockSession {
  title: string;
  goal: string;
}

const MOCK_SESSIONS: MockSession[] = [
  {
    title: 'Machine Learning Research',
    goal: 'Survey latest ML papers and understand transformer architectures'
  },
  {
    title: 'Deep Learning Architectures',
    goal: 'Compare CNN vs Transformer performance on image classification'
  },
  {
    title: 'NLP Techniques',
    goal: 'Study text classification methods and sentiment analysis'
  },
  {
    title: 'Computer Vision Fundamentals',
    goal: 'Understand object detection and image segmentation techniques'
  },
  {
    title: 'Reinforcement Learning',
    goal: 'Learn about Q-learning, policy gradients, and actor-critic methods'
  }
];

interface MockDataResult {
  sessionsCreated: number;
  documentsCreated: number;
  errors: string[];
}

export const generateMockData = async (): Promise<MockDataResult> => {
  const results: MockDataResult = {
    sessionsCreated: 0,
    documentsCreated: 0,
    errors: []
  };

  for (const mockSession of MOCK_SESSIONS) {
    try {
      // Create research session
      const createdSession = await databaseService.createSession(
        mockSession.title,
        mockSession.goal
      );

      results.sessionsCreated++;

      // Create mock document for each session
      try {
        await databaseService.createDocument(
          createdSession.id,
          `Paper - ${mockSession.title}`,
          `/mock/papers/${createdSession.id}.pdf`,
          'application/pdf'
        );
        results.documentsCreated++;
      } catch (error) {
        results.errors.push(`Failed to create document for session ${mockSession.title}: ${error}`);
      }

    } catch (error) {
      results.errors.push(`Failed to create session ${mockSession.title}: ${error}`);
    }
  }

  return results;
};

export const clearAllMockData = async () => {
  try {
    await databaseService.clearAllData();
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
};
