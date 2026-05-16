import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleAiFunction } from './_shared';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await handleAiFunction({
    req,
    res,
    path: '/ai/text',
  });
}
