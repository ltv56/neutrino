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
    if (appLower.includes('chrome') || appLower.includes('firefox') || appLower.includes('edge')) {
      tags.push('#web');

      // Try to extract domain from window title
      const urlMatch = window_title.match(/https?:\/\/([^\s/]+)/);
      if (urlMatch) {
        const domain = urlMatch[1].replace('www.', '');
        tags.push(`#${domain.split('.')[0]}`);
      }
    } else if (appLower.includes('code') || appLower.includes('vscode')) {
      tags.push('#coding');

      // Extract file extension
      const fileMatch = window_title.match(/\.(\w+)/);
      if (fileMatch) {
        tags.push(`#${fileMatch[1]}`);
      }
    } else if (appLower.includes('slack')) {
      tags.push('#slack');
    } else if (appLower.includes('discord')) {
      tags.push('#discord');
    } else if (appLower.includes('notion')) {
      tags.push('#notion');
    } else if (appLower.includes('obsidian')) {
      tags.push('#obsidian');
    }

    return tags;
  },
};
