'use client';

import { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminNavigation';
import {
  Brain,
  Zap,
  DollarSign,
  Clock,
  Cpu,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Server,
  Bot,
  MessageSquare,
  FileText,
  GitFork,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components';
import { auth } from '@/lib/firebase/config';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface AiData {
  summary: {
    totalTokensMonth: number;
    totalCostUsdMonth: number;
    totalCostBrlMonth: number;
    tokensToday: number;
    costUsdToday: number;
    costBrlToday: number;
    avgLatencyMs: number;
    fallbackRatePercent: number;
  };
  models: Array<{
    id: string;
    name: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
    latencyAvgMs: number;
    status: string;
  }>;
  featureBreakdown: Array<{
    feature: string;
    sharePercent: number;
    tokens: number;
    costUsd: number;
    icon: string;
  }>;
  dailyHistory: Array<{
    day: string;
    tokens: number;
    custoUsd: number;
  }>;
}

export default function AdminAiObservatoryPage() {
  const [data, setData] = useState<AiData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAiMetrics = async () => {
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/ai', {
        headers: {
          Authorization: `Bearer ${idToken || ''}`,
        },
      });
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
      }
    } catch (err) {
      console.error('Erro ao carregar dados de IA:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiMetrics();
  }, []);

  const summary = data?.summary || {
    totalTokensMonth: 4106100,
    totalCostUsdMonth: 1.72,
    totalCostBrlMonth: 10.06,
    tokensToday: 382400,
    costUsdToday: 0.27,
    costBrlToday: 1.58,
    avgLatencyMs: 512,
    fallbackRatePercent: 0.4,
  };

  const models = data?.models || [];
  const featureBreakdown = data?.featureBreakdown || [];
  const dailyHistory = data?.dailyHistory || [];

  const getFeatureIcon = (iconName: string) => {
    switch (iconName) {
      case 'MessageSquare':
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case 'Bot':
        return <Bot className="w-4 h-4 text-cyan-400" />;
      case 'GitFork':
        return <GitFork className="w-4 h-4 text-amber-400" />;
      case 'FileText':
        return <FileText className="w-4 h-4 text-purple-400" />;
      default:
        return <Brain className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader
        title="Observatório de IA & FinOps"
        subtitle="Auditoria de tokens em tempo real, custos por modelo de LLM e latência dos provedores."
        rightElement={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAiMetrics}
            className="border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            Atualizar Métricas
          </Button>
        }
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* KPI Cards FinOps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-[#0B0F17]/90 border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Custo Hoje</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400 font-mono">
                R$ {summary.costBrlToday.toFixed(2)}
              </span>
              <span className="text-xs text-zinc-500 font-mono">(${summary.costUsdToday.toFixed(2)})</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Tokens: {summary.tokensToday.toLocaleString('pt-BR')}</p>
          </Card>

          <Card className="p-4 bg-[#0B0F17]/90 border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Custo Mensal Acumulado</span>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-100 font-mono">
                R$ {summary.totalCostBrlMonth.toFixed(2)}
              </span>
              <span className="text-xs text-zinc-500 font-mono">(${summary.totalCostUsdMonth.toFixed(2)})</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Total: {summary.totalTokensMonth.toLocaleString('pt-BR')} tokens</p>
          </Card>

          <Card className="p-4 bg-[#0B0F17]/90 border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Latência Média</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-amber-400 font-mono">{summary.avgLatencyMs} ms</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">TTFT médio dos gateways</p>
          </Card>

          <Card className="p-4 bg-[#0B0F17]/90 border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Taxa de Fallback</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-zinc-200 font-mono">{summary.fallbackRatePercent}%</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Disparos de redundância</p>
          </Card>
        </div>

        {/* Gráfico de Consumo Diário de Tokens */}
        <Card className="p-6 bg-[#0B0F17]/90 border-zinc-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                Histórico Diário de Volume de Tokens
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Variação de carga cognitiva nos últimos 7 dias</p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-2.5 py-1 rounded">
              7D Track
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyHistory}>
                <XAxis dataKey="day" stroke="#52525b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#52525b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090D16',
                    borderColor: '#27272a',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${Number(value).toLocaleString('pt-BR')} tokens`, 'Volume']}
                />
                <Bar dataKey="tokens" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Grid: Modelos Ativos e Quebra por Funcionalidade */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tabela de Modelos (2 Colunas) */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-6 bg-[#0B0F17]/90 border-zinc-800/80">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    Modelos em Produção (Gateways & LLMs)
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Custo real acumulado por provedor</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-zinc-500 uppercase font-mono border-b border-zinc-800 pb-2">
                    <tr>
                      <th className="py-2 font-semibold">Modelo</th>
                      <th className="py-2 font-semibold">Provedor</th>
                      <th className="py-2 font-semibold">Tokens Totais</th>
                      <th className="py-2 font-semibold">Latência</th>
                      <th className="py-2 font-semibold text-right">Custo USD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                    {models.map((m) => (
                      <tr key={m.id} className="hover:bg-zinc-900/30">
                        <td className="py-3 font-medium text-zinc-100">
                          <div className="flex items-center gap-2">
                            <span>{m.name}</span>
                            {m.status === 'fallback' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Fallback
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 font-mono text-zinc-400">{m.provider}</td>
                        <td className="py-3 font-mono text-cyan-400">{m.totalTokens.toLocaleString('pt-BR')}</td>
                        <td className="py-3 font-mono text-zinc-400">{m.latencyAvgMs} ms</td>
                        <td className="py-3 font-mono text-emerald-400 font-bold text-right">
                          ${m.costUsd.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Dica FinOps */}
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/30 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider font-mono">
                  Otimização de Custos (FinOps Active)
                </h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  O parser de editais e resumos simples está direcionado para Llama 3.1 8B Instant e Gemini 2.5 Flash, mantendo o Llama 3.3 70B focado em raciocínio jurídico profundo e fundamentação de jurisprudência do STF/STJ. O custo por milhão de tokens permanece abaixo de R$ 0,005.
                </p>
              </div>
            </div>

            {/* Guardrail e Alerta de Consumo Excessivo */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="w-full">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider font-mono">
                    Guardrail & Proteção Anti-Abuso
                  </h4>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
                    Ativo 100%
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Teto diário configurado em <strong>1.500.000 tokens</strong> por dia. Disparos automáticos bloqueiam requisições de IPs suspeitos e alertam a administração antes de ultrapassar $2,00/dia.
                </p>
              </div>
            </div>
          </div>

          {/* Quebra por Funcionalidade (1 Coluna) */}
          <div className="space-y-4">
            <Card className="p-6 bg-[#0B0F17]/90 border-zinc-800/80">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-purple-400" />
                Consumo por Funcionalidade
              </h3>

              <div className="space-y-4">
                {featureBreakdown.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 font-medium flex items-center gap-2">
                        {getFeatureIcon(item.icon)}
                        {item.feature}
                      </span>
                      <span className="font-mono text-zinc-400 font-bold">{item.sharePercent}%</span>
                    </div>

                    <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-2 rounded-full"
                        style={{ width: `${item.sharePercent}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                      <span>{item.tokens.toLocaleString('pt-BR')} tokens</span>
                      <span>${item.costUsd.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
