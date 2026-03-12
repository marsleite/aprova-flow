'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Users, TrendingUp, Trophy } from 'lucide-react';
import { getUserBenchmark, getBenchmarkData } from '@/lib/firebase/benchmarks';

interface BenchmarkCardProps {
  weeklyGoalHours: number;
  weeklyHours: number;
  userId?: string;
  loading?: boolean;
}

interface BenchmarkData {
  weeklyGoalHours: number;
  totalUsers: number;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  updatedAt: Date;
}

interface UserBenchmark {
  userId: string;
  weeklyGoalHours: number;
  weeklyHours: number;
  percentile: number;
  updatedAt: Date;
}

export default function BenchmarkCard({ weeklyGoalHours, weeklyHours, userId, loading }: BenchmarkCardProps) {
  const [userBenchmark, setUserBenchmark] = useState<UserBenchmark | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | null>(null);
  const [cardLoading, setCardLoading] = useState(true);

  useEffect(() => {
    const fetchBenchmarkData = async () => {
      if (!weeklyGoalHours || weeklyHours === 0 || !userId) {
        setCardLoading(false);
        return;
      }

      try {
        const [userBench, benchData] = await Promise.all([
          getUserBenchmark(userId),
          getBenchmarkData(weeklyGoalHours),
        ]);

        setUserBenchmark(userBench);
        setBenchmarkData(benchData);
      } catch (error) {
        console.error('Error fetching benchmark data:', error);
      } finally {
        setCardLoading(false);
      }
    };

    fetchBenchmarkData();
  }, [weeklyGoalHours, weeklyHours, userId]);

  if (cardLoading || loading) {
    return (
      <div className="rounded-xl border border-am-border-default bg-am-surface-elevated p-5">
        <div className="mb-4 h-5 w-32 rounded shimmer" />
        <div className="space-y-3">
          <div className="h-3 w-full rounded shimmer" />
          <div className="h-3 w-3/4 rounded shimmer" />
          <div className="h-3 w-1/2 rounded shimmer" />
        </div>
      </div>
    );
  }

  if (!weeklyGoalHours || weeklyHours === 0) {
    return (
      <div className="rounded-xl border border-am-border-default bg-am-surface-elevated p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3150AA]/10">
            <BarChart3 className="h-4 w-4 text-[#F59768]" />
          </div>
          <h3 className="text-sm font-semibold text-am-text-primary">Benchmark Anônimo</h3>
        </div>
        <p className="text-sm text-am-text-secondary">Comece a estudar para comparar seu progresso com outros concurseiros.</p>
      </div>
    );
  }

  const percentile = userBenchmark?.percentile || 0;
  const totalUsers = benchmarkData?.totalUsers || 1;

  const getPercentileColor = (p: number) => {
    if (p >= 90) return 'text-green-400';
    if (p >= 75) return 'text-[#F59768]';
    if (p >= 50) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getPercentileMessage = (p: number) => {
    if (p >= 90) return 'Excelente! Você está no topo!';
    if (p >= 75) return 'Muito bom! Acima da média!';
    if (p >= 50) return 'Bom trabalho! Na média!';
    if (p >= 25) return 'Continue assim! Você está progredindo!';
    return 'Vamos lá! Dê seu melhor!';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-am-border-default bg-am-surface-elevated p-5"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3150AA]/10">
          <BarChart3 className="h-4 w-4 text-[#F59768]" />
        </div>
        <h3 className="text-sm font-semibold text-am-text-primary">Benchmark Anônimo</h3>
        <span className="text-xs text-am-text-secondary ml-auto">
          {totalUsers} concurseiros
        </span>
      </div>

      {/* Percentil do usuário */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-am-text-secondary">Sua posição</span>
          <span className={`text-2xl font-bold ${getPercentileColor(percentile)}`}>
            {percentile}º
          </span>
        </div>
        <div className="w-full bg-am-surface-subtle rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentile}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-2 rounded-full ${
              percentile >= 90 ? 'bg-green-500' :
              percentile >= 75 ? 'bg-blue-500' :
              percentile >= 50 ? 'bg-yellow-500' :
              'bg-gray-600'
            }`}
          />
        </div>
        <p className="text-xs text-am-text-secondary mt-2">
          {getPercentileMessage(percentile)}
        </p>
      </div>

      {/* Comparação com percentis */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-am-text-secondary">Top 10%</span>
          <span className="text-sm text-green-400">
            {benchmarkData?.percentiles.p90 || 0}h
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-am-text-secondary">Top 25%</span>
          <span className="text-sm text-[#F59768]">
            {benchmarkData?.percentiles.p75 || 0}h
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-am-text-secondary">Mediana (50%)</span>
          <span className="text-sm text-yellow-400">
            {benchmarkData?.percentiles.p50 || 0}h
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-am-text-secondary">Você</span>
          <span className="text-sm text-am-text-primary font-medium">
            {weeklyHours.toFixed(1)}h
          </span>
        </div>
      </div>

      {/* Badge de conquista */}
      {percentile >= 75 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="mt-4 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600/15 to-violet-600/15 rounded-lg border border-blue-500/25"
        >
          <Trophy className="h-4 w-4 text-[#F59768]" />
          <span className="text-xs text-violet-300">
            {percentile >= 90 ? 'Elite!' : 'Acima da média!'}
          </span>
        </motion.div>
      )}

      <p className="text-xs text-am-text-tertiary mt-4">
        Dados 100% anônimos • Comparado com usuários de meta similar
      </p>
    </motion.div>
  );
}
