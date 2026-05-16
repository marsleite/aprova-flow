import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleBackendRequest } from '../src/vercel/backend';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await handleBackendRequest(req, res);
}
