import { invoke } from '@tauri-apps/api/core';
import type { DatabaseStats } from '@/types';

export const debugService = {
  async clearAllData(): Promise<void> {
    return await invoke('clear_all_data');
  },

  async getDatabaseStats(): Promise<DatabaseStats> {
    return await invoke('get_database_stats');
  },
};
