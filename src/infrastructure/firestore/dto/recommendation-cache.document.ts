export const RECOMMENDATION_CACHE_SCHEMA_VERSION = 1 as const;

export interface RecommendationCacheItemDocument {
  type: string;
  target: string;
  urgency: string;
  summary: string;
  reason: string[];
  suggestedAction: string;
  expectedImpact: string;
  dueWindow: string;
  priorityScore: number;
}

export interface RecommendationCacheDocument {
  schemaVersion: typeof RECOMMENDATION_CACHE_SCHEMA_VERSION;
  userId: string;
  planId: string;
  cacheDate: string;
  engineVersion: string;
  inputSignature: string;
  computedAt: string;
  recommendations: RecommendationCacheItemDocument[];
}
