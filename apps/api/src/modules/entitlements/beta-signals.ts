import {
  buildBetaSignalsSummary,
  type BetaAiUsageEventDoc,
  type BetaProductEventDoc,
  type BetaSignalsSummary,
} from '@aprovamind/contracts/analytics/BetaSignals';
import { listFirestoreDocumentsWithUserToken } from '@aprovamind/infrastructure-firebase';

const PRODUCT_USAGE_COLLECTION = 'product_usage_events';
const AI_USAGE_COLLECTION = 'ai_usage_events';

export async function loadAdminBetaSignalsSummary(params: {
  idToken: string;
  windowDays?: number;
  now?: Date;
}): Promise<BetaSignalsSummary> {
  const windowDays = params.windowDays && params.windowDays > 0 ? params.windowDays : 7;
  const now = params.now ?? new Date();

  const [productResult, aiResult] = await Promise.all([
    listFirestoreDocumentsWithUserToken({
      collection: PRODUCT_USAGE_COLLECTION,
      idToken: params.idToken,
      pageSize: 500,
    }),
    listFirestoreDocumentsWithUserToken({
      collection: AI_USAGE_COLLECTION,
      idToken: params.idToken,
      pageSize: 500,
    }),
  ]);

  if (!productResult.ok) {
    throw new Error(productResult.error || 'Nao foi possivel listar product_usage_events.');
  }

  if (!aiResult.ok) {
    throw new Error(aiResult.error || 'Nao foi possivel listar ai_usage_events.');
  }

  const productEvents = (productResult.documents || []).map(
    ({ id, data }) => ({ id, ...(data as unknown as BetaProductEventDoc) })
  );
  const aiEvents = (aiResult.documents || []).map(
    ({ id, data }) => ({ id, ...(data as unknown as BetaAiUsageEventDoc) })
  );

  return buildBetaSignalsSummary(productEvents, aiEvents, now, windowDays);
}
