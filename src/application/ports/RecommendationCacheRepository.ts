import type { Recommendation } from '@/domain/types';

export interface RecommendationCacheEntry {
  userId: string;
  planId: string;
  cacheDate: string;
  engineVersion: string;
  inputSignature: string;
  computedAt: string;
  recommendations: Recommendation[];
}

export interface RecommendationCacheRepository {
  get(userId: string, planId: string, cacheDate: string): Promise<RecommendationCacheEntry | null>;
  save(entry: RecommendationCacheEntry): Promise<void>;
}
