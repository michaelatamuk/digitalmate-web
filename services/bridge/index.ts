import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { handleOrbitRequest } from '../../server/orbit';
import { handleRssRequest } from '../../server/rss';

const root = resolve(process.cwd(), 'dist');
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? '127.0.0.1';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8'
};

function notFound(response: ServerResponse): void {
  response.statusCode = 404;
  response.setHeader('content-type', 'text/plain; charset=utf-8');
  response.end('Not found');
}

function sendFile(request: IncomingMessage, response: ServerResponse, filePath: string): void {
  const extension = extname(filePath);
  response.statusCode = 200;
  response.setHeader('content-type', MIME[extension] ?? 'application/octet-stream');
  if (filePath.includes(`${sep}assets${sep}`)) {
    response.setHeader('cache-control', 'public, max-age=31536000, immutable');
  } else if (extension === '.js' || extension === '.webmanifest' || extension === '.html') {
    response.setHeader('cache-control', 'no-cache');
  }
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

    if (url.pathname === '/api/rss') {
      await handleRssRequest(request, response);
      return;
    }
    if (url.pathname.startsWith('/api/orbit/')) {
      await handleOrbitRequest(request, response);
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.statusCode = 405;
      response.end();
      return;
    }

    const pathname = decodeURIComponent(url.pathname);
    const candidate = resolve(root, `.${pathname}`);
    if (candidate !== root && !candidate.startsWith(root + sep)) {
      response.statusCode = 403;
      response.end();
      return;
    }

    if (existsSync(candidate) && statSync(candidate).isFile()) {
      sendFile(request, response, candidate);
      return;
    }

    if (pathname.startsWith('/assets/')) {
      notFound(response);
      return;
    }

    sendFile(request, response, join(root, 'index.html'));
  } catch (error) {
    response.statusCode = 500;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Bridge server error' })
    );
  }
});

server.listen(port, host, () => {
  console.log(`DigitalMate bridge listening on http://${host}:${port}`);
  console.log(`Static root: ${root}`);
});
