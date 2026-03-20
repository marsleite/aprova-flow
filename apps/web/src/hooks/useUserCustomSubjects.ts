'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CUSTOM_SUBJECT_ADDED_EVENT,
  getUserCustomSubjects,
  mergeSubjectOptions,
  persistUserCustomSubject,
} from '@/lib/firebase/subjects';

export function useUserCustomSubjects(userId?: string) {
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCustomSubjects([]);
      return;
    }

    setLoading(true);
    try {
      const subjects = await getUserCustomSubjects(userId);
      setCustomSubjects(subjects);
    } catch (error) {
      console.error('Erro ao carregar matérias customizadas:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCustomSubjectAdded = (event: Event) => {
      const customEvent = event as CustomEvent<{ subject?: string }>;
      const subject = customEvent.detail?.subject;
      if (!subject) return;
      setCustomSubjects((prev) => mergeSubjectOptions(prev, [subject]));
    };

    window.addEventListener(CUSTOM_SUBJECT_ADDED_EVENT, handleCustomSubjectAdded as EventListener);
    return () => {
      window.removeEventListener(CUSTOM_SUBJECT_ADDED_EVENT, handleCustomSubjectAdded as EventListener);
    };
  }, []);

  const persistSubject = useCallback(
    async (subject: string, knownSubjects: readonly string[] = []) => {
      if (!userId) return subject.trim();

      const savedSubject = await persistUserCustomSubject(userId, subject, knownSubjects);
      setCustomSubjects((prev) => mergeSubjectOptions(prev, [savedSubject]));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(CUSTOM_SUBJECT_ADDED_EVENT, {
            detail: { subject: savedSubject },
          })
        );
      }

      return savedSubject;
    },
    [userId]
  );

  return useMemo(
    () => ({
      customSubjects,
      loading,
      persistSubject,
      refresh,
    }),
    [customSubjects, loading, persistSubject, refresh]
  );
}
