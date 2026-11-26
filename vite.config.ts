import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { rssProxyPlugin } from './server/rss';
import { orbitBridgePlugin } from './server/orbit';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(fileEnv)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    base: process.env.VITE_BASE ?? '/',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    plugins: [react(), rssProxyPlugin(), orbitBridgePlugin()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      // With a local runtime bridge, let the app find it without any setting. Tests set
      // VITE_AUTO_BACKEND=off so they keep exercising the in-process mocks.
      proxy:
        process.env.VITE_AUTO_BACKEND === 'off'
          ? undefined
          : {
              '/api/orbit': {
                target: process.env.VITE_DEV_API_TARGET ?? 'http://127.0.0.1:8790',
                changeOrigin: false
              },
              '/api/hive': {
                target: process.env.VITE_DEV_API_TARGET ?? 'http://127.0.0.1:8790',
                changeOrigin: false
              }
            }
    }
  };
});
