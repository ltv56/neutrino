import { invoke } from '@tauri-apps/api/core';

export const windowService = {
  async showMainWindow(): Promise<void> {
    await invoke('show_main_window');
  },
};
