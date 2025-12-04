import { useEffect, useState } from 'react';
import { smartCaptureService, type WindowContext } from '@/services/smartCapture';

interface UseSmartCaptureOptions {
  onContextDetected?: (context: WindowContext, tags: string[]) => void;
}

export function useSmartCapture(options: UseSmartCaptureOptions = {}) {
  const { onContextDetected } = options;

  const [windowContext, setWindowContext] = useState<WindowContext | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  // Listen for context changes from background monitor
  useEffect(() => {
    let mounted = true;

    const setupContextListener = async () => {
      try {
        // Listen for context-changed events from background monitor
        const unlisten = await smartCaptureService.onContextChange((context) => {
          if (!mounted) return;

          setWindowContext(context);

          // Generate tags from context
          const tags = smartCaptureService.generateTags(context);
          setSuggestedTags(tags);

          if (onContextDetected) {
            onContextDetected(context, tags);
          }
        });

        return unlisten;
      } catch (error) {
        console.error('[SmartCapture] Failed to setup context listener:', error);
      }
    };

    setupContextListener();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  return {
    windowContext,
    suggestedTags,
  };
}
