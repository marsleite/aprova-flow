'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, DollarSign, Gauge, TriangleAlert, RefreshCw } from 'lucide-react';
import { AiUsageSummary, getAiUsageSummary } from '@/lib/firebase/aiUsage';

interface AiUsageSummaryCardProps {
  userId: string;
}

function formatUsd(v: number): string {
  if (v === 0) return '$0.00';
  if (v < 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(2)}`;
}

export default function AiUsageSummaryCard({ userId }: AiUsageSummaryCardProps) {
  const [data, setData] = useState<AiUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await getAiUsageSummary(userId);
      setData(summary);
    } catch {
      setError('Não foi possível carregar telemetria de IA.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 via-gray-900 to-gray-950 p-5 shadow-2xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/20/20 p-2.5">
            <Cpu className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Telemetria de IA</h3>
            <p className="text-xs text-muted-foreground">Uso e custo estimado (últimos 7 dias)</p>
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg bg-gray-800/80 p-2 text-gray-300 transition hover:bg-gray-700 disabled:opacity-50"
          title="Atualizar"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando telemetria...</p>}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <TriangleAlert className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted p-3">
              <p className="text-[11px] text-muted-foreground">Chamadas 24h</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{data.events24h}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted p-3">
              <p className="text-[11px] text-muted-foreground">Chamadas 7d</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{data.events7d}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted p-3">
              <p className="text-[11px] text-muted-foreground">Custo 24h</p>
              <p className="mt-1 text-lg font-semibold text-emerald-300">{formatUsd(data.totalCost24hUsd)}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted p-3">
              <p className="text-[11px] text-muted-foreground">Custo 7d</p>
              <p className="mt-1 text-lg font-semibold text-emerald-300">{formatUsd(data.totalCost7dUsd)}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted p-3">
              <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Gauge className="h-3.5 w-3.5" />
                Tokens (7d)
              </div>
              <p className="text-sm font-medium text-foreground">{data.totalTokens7d.toLocaleString('pt-BR')}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted p-3">
              <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                Taxa de erro (7d)
              </div>
              <p className={`text-sm font-medium ${data.errorRate7dPercent > 10 ? 'text-amber-300' : 'text-foreground'}`}>
                {data.errorRate7dPercent}%
              </p>
            </div>
          </div>

          {data.byTask7d.length > 0 && (
            <div className="rounded-xl border border-border bg-muted p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Uso por tarefa (7d)</p>
              <div className="space-y-1.5">
                {data.byTask7d.slice(0, 4).map((item) => (
                  <div key={item.task} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">{item.task}</span>
                    <span className="text-muted-foreground">{item.events} chamadas · {formatUsd(item.costUsd)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
