import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface WindowContext {
  app_name: string;
  window_title: string;
  timestamp: number;
}

export const smartCaptureService = {
  /**
   * Get the current active window context
   */
  async getWindowContext(): Promise<WindowContext> {
    return invoke<WindowContext>('get_window_context');
  },

  /**
   * Start monitoring context changes
   * @param intervalMs - Polling interval in milliseconds (default: 1000)
   */
  async startContextMonitor(intervalMs: number = 1000): Promise<void> {
    return invoke('start_context_monitor', { intervalMs });
  },

  /**
   * Stop monitoring context changes
   */
  async stopContextMonitor(): Promise<void> {
    return invoke('stop_context_monitor');
  },

  /**
   * Check if context monitor is enabled
   */
  async isContextMonitorEnabled(): Promise<boolean> {
    return invoke<boolean>('is_context_monitor_enabled');
  },

  /**
   * Listen for context changes (window focus changes)
   * @param callback - Function to call when context changes
   * @returns Unlisten function
   */
  async onContextChange(callback: (context: WindowContext) => void) {
    return listen<WindowContext>('context-changed', (event) => {
      callback(event.payload);
    });
  },

  /**
   * Generate suggested tags based on window context
   */
  generateTags(context: WindowContext): string[] {
    const tags: string[] = [];
    const { app_name, window_title } = context;

    // Tag based on application
    const appLower = app_name.toLowerCase();
    const titleLower = window_title.toLowerCase();

    // Browsers
    if (appLower.includes('chrome') || appLower.includes('firefox') || appLower.includes('edge') ||
        appLower.includes('brave') || appLower.includes('opera') || appLower.includes('safari')) {
      tags.push('#web');

      // Try to extract domain from window title
      const urlMatch = window_title.match(/https?:\/\/([^\s/]+)/);
      if (urlMatch) {
        const domain = urlMatch[1].replace('www.', '');
        tags.push(`#${domain.split('.')[0]}`);
      }
    }
    // IDEs & Code Editors
    else if (appLower.includes('code') || appLower.includes('vscode') ||
             appLower.includes('intellij') || appLower.includes('pycharm') ||
             appLower.includes('webstorm') || appLower.includes('rider') ||
             appLower.includes('android studio') || appLower.includes('visual studio')) {
      tags.push('#coding');

      // Extract file extension
      const fileMatch = window_title.match(/\.(\w+)/);
      if (fileMatch) {
        tags.push(`#${fileMatch[1]}`);
      }
    }
    // Terminals
    else if (appLower.includes('terminal') || appLower.includes('powershell') ||
             appLower.includes('cmd') || appLower.includes('wt.exe') ||
             appLower.includes('windowsterminal') || appLower.includes('iterm')) {
      tags.push('#terminal');
    }
    // Communication
    else if (appLower.includes('slack')) {
      tags.push('#slack');
    } else if (appLower.includes('discord')) {
      tags.push('#discord');
    } else if (appLower.includes('teams') || appLower.includes('microsoft teams')) {
      tags.push('#teams');
    } else if (appLower.includes('zoom')) {
      tags.push('#zoom');
    } else if (appLower.includes('telegram')) {
      tags.push('#telegram');
    } else if (appLower.includes('whatsapp')) {
      tags.push('#whatsapp');
    }
    // Note-taking & Knowledge Management
    else if (appLower.includes('notion')) {
      tags.push('#notion');
    } else if (appLower.includes('obsidian')) {
      tags.push('#obsidian');
    } else if (appLower.includes('evernote')) {
      tags.push('#evernote');
    } else if (appLower.includes('onenote')) {
      tags.push('#onenote');
    } else if (appLower.includes('roam')) {
      tags.push('#roam');
    }
    // Office Suite
    else if (appLower.includes('word') || appLower.includes('winword')) {
      tags.push('#office');
      tags.push('#word');
    } else if (appLower.includes('excel')) {
      tags.push('#office');
      tags.push('#excel');
    } else if (appLower.includes('powerpoint')) {
      tags.push('#office');
      tags.push('#powerpoint');
    } else if (appLower.includes('outlook')) {
      tags.push('#email');
    }
    // Design Tools
    else if (appLower.includes('photoshop')) {
      tags.push('#design');
      tags.push('#photoshop');
    } else if (appLower.includes('illustrator')) {
      tags.push('#design');
      tags.push('#illustrator');
    } else if (appLower.includes('figma')) {
      tags.push('#design');
      tags.push('#figma');
    } else if (appLower.includes('sketch')) {
      tags.push('#design');
    } else if (appLower.includes('canva')) {
      tags.push('#design');
    }
    // Development Tools
    else if (appLower.includes('github') || titleLower.includes('github')) {
      tags.push('#github');
    } else if (appLower.includes('gitlab')) {
      tags.push('#gitlab');
    } else if (appLower.includes('postman')) {
      tags.push('#api');
    } else if (appLower.includes('docker')) {
      tags.push('#docker');
    }
    // Project Management
    else if (appLower.includes('trello')) {
      tags.push('#project');
      tags.push('#trello');
    } else if (appLower.includes('jira')) {
      tags.push('#project');
      tags.push('#jira');
    } else if (appLower.includes('asana')) {
      tags.push('#project');
      tags.push('#asana');
    }
    // Media
    else if (appLower.includes('spotify')) {
      tags.push('#music');
    } else if (appLower.includes('youtube')) {
      tags.push('#video');
    } else if (appLower.includes('vlc')) {
      tags.push('#media');
    }

    return tags;
  },
};
