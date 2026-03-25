import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleWithFastify } from '../_shared';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await handleWithFastify({
    req,
    res,
    targetPath: '/entitlements/scenarios',
  });
}
