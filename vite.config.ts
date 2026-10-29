import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { rssProxyPlugin } from './server/rss';

export default defineConfig({
  plugins: [react(), rssProxyPlugin()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  }
});
