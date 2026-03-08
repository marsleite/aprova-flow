'use client';

import { useState, useCallback } from 'react';
import type { PortfolioSnapshotV1 } from '@/application/dto/PortfolioSnapshot';
import { auth } from '@/lib/firebase/config';

interface UsePortfolioEngineResult {
    portfolio: PortfolioSnapshotV1 | null;
    loading: boolean;
    error: string | null;
    fetchPortfolio: (globalWeeklyBudget?: number) => Promise<void>;
    clearCache: () => void;
}

export function usePortfolioEngine(): UsePortfolioEngineResult {
    const [portfolio, setPortfolio] = useState<PortfolioSnapshotV1 | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPortfolio = useCallback(async (globalWeeklyBudget: number = 30) => {
        setLoading(true);
        setError(null);
        try {
            const idToken = await auth.currentUser?.getIdToken();
            if (!idToken) throw new Error('not-authenticated');

            const url = new URL('/api/engine/portfolio', window.location.origin);
            url.searchParams.append('globalWeeklyBudget', globalWeeklyBudget.toString());

            const response = await fetch(url.toString(), {
                headers: {
                    Authorization: `Bearer ${idToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Falha ao carregar o portfólio multi-edital.');
            }

            const data = await response.json();
            if (data.found && data.snapshot) {
                setPortfolio(data.snapshot);
            } else if (!data.found && data.reason === 'no_plans_found') {
                setPortfolio(null);
            } else {
                throw new Error(data.reason || 'Erro desconhecido');
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro ao processar portfólio');
            setPortfolio(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const clearCache = useCallback(() => {
        setPortfolio(null);
    }, []);

    return { portfolio, loading, error, fetchPortfolio, clearCache };
}
