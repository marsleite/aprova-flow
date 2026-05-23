import type { IncomingMessage, ServerResponse } from 'node:http';

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify({
    service: 'aprovamind-api',
    status: 'ok',
    message: 'Use /health, /ai/text, /ai/pdf e as rotas autenticadas do produto.',
  }));
}
