import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4000,
  },
  resolve: {
    alias: {
      '@creative-editor/types': path.resolve(__dirname, '../../packages/types/src'),
      '@creative-editor/engine': path.resolve(__dirname, '../../packages/engine/src'),
      // '@creative-editor/renderer': path.resolve(__dirname, '../../packages/renderer/src'),
      '@creative-editor/react-editor': path.resolve(
        __dirname,
        '../../packages/react-editor/src'
      ),
    },
  },
});
