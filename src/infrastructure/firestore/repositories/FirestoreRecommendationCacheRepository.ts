import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import type {
  RecommendationCacheEntry,
  RecommendationCacheRepository,
} from '@/application/ports/RecommendationCacheRepository';
import { db } from '@/lib/firebase/config';
import { RECOMMENDATION_CACHE_COLLECTION } from '../collections';
import type { RecommendationCacheDocument } from '../dto/recommendation-cache.document';
import {
  fromRecommendationCacheEntry,
  toRecommendationCacheEntry,
} from '../mappers/recommendation-cache.mapper';

function cacheDocumentId(userId: string, planId: string, cacheDate: string): string {
  return `${userId}_${planId}_${cacheDate}`;
}

export class FirestoreRecommendationCacheRepository
  implements RecommendationCacheRepository {
  async get(
    userId: string,
    planId: string,
    cacheDate: string
  ): Promise<RecommendationCacheEntry | null> {
    const snapshot = await getDoc(
      doc(db, RECOMMENDATION_CACHE_COLLECTION, cacheDocumentId(userId, planId, cacheDate))
    );

    if (!snapshot.exists()) return null;

    return toRecommendationCacheEntry(snapshot.data() as RecommendationCacheDocument);
  }

  async save(entry: RecommendationCacheEntry): Promise<void> {
    await setDoc(
      doc(
        db,
        RECOMMENDATION_CACHE_COLLECTION,
        cacheDocumentId(entry.userId, entry.planId, entry.cacheDate)
      ),
      fromRecommendationCacheEntry(entry),
      { merge: true }
    );
  }
}
