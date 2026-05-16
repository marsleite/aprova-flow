import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleWithAiFastify } from './_shared';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await handleWithAiFastify({
    req,
    res,
    targetPath: '/ai/pdf',
  });
}
