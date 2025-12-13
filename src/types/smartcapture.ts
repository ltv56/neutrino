import type { WindowContext } from '@/services/smartCapture';

export interface ClipboardContent {
    content: string;
    content_type: 'Text' | 'Code' | 'Url' | 'FilePath' | 'Unknown';
    timestamp: number;
    context?: WindowContext;
}
