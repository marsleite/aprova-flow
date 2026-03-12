import type { RecommendationCacheEntry } from '@aprovamind/application/ports/RecommendationCacheRepository';
import type {
  RecommendationCacheDocument,
  RecommendationCacheItemDocument,
} from '../dto/recommendation-cache.document';
import { RECOMMENDATION_CACHE_SCHEMA_VERSION } from '../dto/recommendation-cache.document';

function toItemDocument(
  item: RecommendationCacheEntry['recommendations'][number]
): RecommendationCacheItemDocument {
  return {
    type: item.type,
    target: item.target,
    urgency: item.urgency,
    summary: item.summary,
    reason: [...item.reason],
    suggestedAction: item.suggestedAction,
    expectedImpact: item.expectedImpact,
    dueWindow: item.dueWindow,
    priorityScore: item.priorityScore,
  };
}

export function fromRecommendationCacheEntry(
  entry: RecommendationCacheEntry
): RecommendationCacheDocument {
  return {
    schemaVersion: RECOMMENDATION_CACHE_SCHEMA_VERSION,
    userId: entry.userId,
    planId: entry.planId,
    cacheDate: entry.cacheDate,
    engineVersion: entry.engineVersion,
    inputSignature: entry.inputSignature,
    computedAt: entry.computedAt,
    recommendations: entry.recommendations.map(toItemDocument),
  };
}

export function toRecommendationCacheEntry(
  doc: RecommendationCacheDocument
): RecommendationCacheEntry {
  return {
    userId: doc.userId,
    planId: doc.planId,
    cacheDate: doc.cacheDate,
    engineVersion: doc.engineVersion,
    inputSignature: doc.inputSignature,
    computedAt: doc.computedAt,
    recommendations: doc.recommendations.map((item) => ({
      id: `${doc.planId}:${item.target}:${item.type}`,
      type: item.type as RecommendationCacheEntry['recommendations'][number]['type'],
      target: item.target,
      urgency: item.urgency as RecommendationCacheEntry['recommendations'][number]['urgency'],
      summary: item.summary,
      reason: [...item.reason],
      suggestedAction: item.suggestedAction,
      expectedImpact: item.expectedImpact,
      dueWindow: item.dueWindow as RecommendationCacheEntry['recommendations'][number]['dueWindow'],
      priorityScore: item.priorityScore,
      createdAt: doc.computedAt,
    })),
  };
}
