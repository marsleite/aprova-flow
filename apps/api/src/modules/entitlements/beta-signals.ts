import {
  buildBetaSignalsSummary,
  type BetaAiUsageEventDoc,
  type BetaProductEventDoc,
  type BetaSignalsSummary,
} from '@aprovamind/contracts/analytics/BetaSignals';
import { listFirestoreDocumentsWithUserToken } from '@aprovamind/infrastructure-firebase';

const PRODUCT_USAGE_COLLECTION = 'product_usage_events';
const AI_USAGE_COLLECTION = 'ai_usage_events';

type FirestoreListResult = Awaited<ReturnType<typeof listFirestoreDocumentsWithUserToken>>;

function collectDocumentsOrWarn(
  result: FirestoreListResult,
  collection: string,
  warnings: string[]
) {
  if (result.ok) {
    return result.documents || [];
  }

  warnings.push(`${collection}_unavailable`);
  return [];
}

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

  const dataWarnings: string[] = [];

  const productEvents = collectDocumentsOrWarn(
    productResult,
    PRODUCT_USAGE_COLLECTION,
    dataWarnings
  ).map(
    ({ id, data }) => ({ id, ...(data as unknown as BetaProductEventDoc) })
  );
  const aiEvents = collectDocumentsOrWarn(
    aiResult,
    AI_USAGE_COLLECTION,
    dataWarnings
  ).map(
    ({ id, data }) => ({ id, ...(data as unknown as BetaAiUsageEventDoc) })
  );

  const summary = buildBetaSignalsSummary(productEvents, aiEvents, now, windowDays);

  if (dataWarnings.length > 0) {
    return {
      ...summary,
      dataWarnings,
    };
  }

  return summary;
}
