import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { rssProxyPlugin } from './server/rss';
import { orbitBridgePlugin } from './server/orbit';

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(fileEnv)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    plugins: [react(), rssProxyPlugin(), orbitBridgePlugin()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true
    }
  };
});
