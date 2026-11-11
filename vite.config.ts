import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  cacheDir: 'node_modules/.vite',
  plugins: [react(), tailwindcss()],
  logLevel: 'warn',

  server: {
    port: 3000,
    cors: true,
    watch: {
      usePolling: false,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/target/**'],
    },
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router-dom',
      'lru-cache',
      'lucide-react',
    ],
    exclude: [
      '@tauri-apps/api',
      '@tauri-apps/plugin-dialog',
      '@tauri-apps/plugin-fs',
      'pdfjs-dist',
    ],
  },

  css: {
    devSourcemap: false,
  },

  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    treeShaking: true,
  },

  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom', 'react-dom/client'],
          'react-router': ['react-router-dom'],
          'react-query': ['@tanstack/react-query'],
          'icons': ['lucide-react'],
          'pdf': ['pdfjs-dist', 'react-pdf'],
          'tauri': [
            '@tauri-apps/api',
            '@tauri-apps/plugin-dialog',
            '@tauri-apps/plugin-fs',
            '@tauri-apps/plugin-process',
          ],
          'codemirror': [
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/commands',
            '@codemirror/language',
            '@codemirror/autocomplete',
            '@codemirror/search',
            // core and langs import each other, so they must share one chunk
            '@codemirror/lang-markdown',
            '@codemirror/lang-javascript',
            '@codemirror/lang-python',
            '@codemirror/lang-json',
            '@codemirror/lang-html',
            '@codemirror/lang-css',
            '@codemirror/lang-sql',
            '@codemirror/lang-rust',
            '@codemirror/lang-go',
            '@codemirror/lang-java',
            '@codemirror/lang-cpp',
            '@codemirror/lang-php',
            '@codemirror/lang-xml',
            '@codemirror/lang-yaml',
            '@codemirror/language-data',
            '@lezer/highlight',
            '@lezer/markdown',
          ],
          'markdown': ['react-markdown', 'marked', 'remark-gfm', 'unist-util-visit'],
          'ui': ['@headlessui/react', 'zustand'],
        },
      },
    },
  },

  resolve: {
    alias: {
      '@/test': path.resolve(__dirname, './src/components/test'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
