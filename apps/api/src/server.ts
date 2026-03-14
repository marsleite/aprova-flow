import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import app from './app';

function loadLocalEnvFiles() {
  const candidates = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '../web/.env.local'),
  ];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    try {
      process.loadEnvFile(filePath);
    } catch {
      // Best-effort local DX: production should rely on real environment variables.
    }
  }
}

async function start() {
  loadLocalEnvFiles();

  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? '0.0.0.0';

  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
