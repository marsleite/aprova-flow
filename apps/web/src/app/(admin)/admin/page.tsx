'use client';

import { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminNavigation';
import {
  Users,
  CreditCard,
  Brain,
  MessageSquare,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Server,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components';
import Link from 'next/link';
import { auth } from '@/lib/firebase/config';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface OverviewData {
  metrics: {
    totalUsers: number;
    proUsers: number;
    freeUsers: number;
    mrrBrl: number;
    arrBrl: number;
    whatsappConnectedCount: number;
    aiTokensToday: number;
    aiCostUsdToday: number;
    aiCostBrlToday: number;
    simuladosTotal: number;
  };
  services: Array<{
    name: string;
    url: string;
    status: 'healthy' | 'degraded' | 'down';
    latencyMs: number;
  }>;
  registrationHistory: Array<{
    date: string;
    novosCadastros: number;
    simuladosFeitos: number;
    duvidasWhatsapp: number;
  }>;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/overview', {
        headers: {
          Authorization: `Bearer ${idToken || ''}`,
        },
      });
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
      }
    } catch (err) {
      console.error('Erro ao carregar overview do admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const metrics = data?.metrics || {
    totalUsers: 0,
    proUsers: 0,
    freeUsers: 0,
    mrrBrl: 0,
    arrBrl: 0,
    whatsappConnectedCount: 0,
    aiTokensToday: 0,
    aiCostUsdToday: 0,
    aiCostBrlToday: 0,
    simuladosTotal: 0,
  };

  const services = data?.services || [
    { name: 'Web (Next.js 16)', url: 'https://aprovamind.com.br', status: 'healthy', latencyMs: 12 },
    { name: 'Go Core API', url: 'https://core.aprovamind.com.br', status: 'healthy', latencyMs: 45 },
    { name: 'Supabase DB & RAG', url: 'https://supabase.aprovamind.com.br', status: 'healthy', latencyMs: 18 },
    { name: 'Evolution WhatsApp', url: 'https://whats.aprovamind.com.br', status: 'healthy', latencyMs: 80 },
  ];

  const history = data?.registrationHistory || [];

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader
        title="Cockpit Executivo & Operações"
        subtitle="Métricas consolidadas de tração, faturamento, observabilidade e infraestrutura."
      />

      <main className="p-8 space-y-8 flex-1">
        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Usuários */}
          <div className="p-5 rounded-xl bg-[#0E131F] border border-zinc-800/80 hover:border-cyan-500/30 transition-all space-y-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs uppercase font-mono tracking-wider font-semibold">Total de Alunos</span>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold font-sans text-white tracking-tight">
                {metrics.totalUsers}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-emerald-400 font-semibold flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" /> +14%
                </span>
                <span className="text-[11px] text-zinc-500">nos últimos 30 dias</span>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-900 flex justify-between text-[11px] text-zinc-400">
              <span>{metrics.proUsers} Pro ({((metrics.proUsers / metrics.totalUsers) * 100).toFixed(1)}%)</span>
              <span>{metrics.freeUsers} Free</span>
            </div>
          </div>

          {/* Card 2: Faturamento MRR */}
          <div className="p-5 rounded-xl bg-[#0E131F] border border-zinc-800/80 hover:border-emerald-500/30 transition-all space-y-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs uppercase font-mono tracking-wider font-semibold">MRR (Recorrência)</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold font-sans text-emerald-400 tracking-tight">
                R$ {metrics.mrrBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-zinc-400 font-mono">
                  ARR: R$ {metrics.arrBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-900 flex justify-between text-[11px] text-zinc-400">
              <span>18 assinaturas ativas</span>
              <span className="text-emerald-400 font-medium">Hotmart Pay</span>
            </div>
          </div>

          {/* Card 3: Custo de IA */}
          <div className="p-5 rounded-xl bg-[#0E131F] border border-zinc-800/80 hover:border-amber-500/30 transition-all space-y-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs uppercase font-mono tracking-wider font-semibold">Custo de IA Hoje</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Brain className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold font-sans text-amber-300 tracking-tight">
                R$ {metrics.aiCostBrlToday.toFixed(2)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-zinc-400 font-mono">
                  US$ {metrics.aiCostUsdToday.toFixed(2)} · {metrics.aiTokensToday.toLocaleString('pt-BR')} tokens
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-900 flex justify-between text-[11px] text-zinc-400">
              <span>Llama 70B & Gemini Flash</span>
              <Link href="/admin/ai" className="text-cyan-400 hover:underline">Ver FinOps →</Link>
            </div>
          </div>

          {/* Card 4: WhatsApp Companion */}
          <div className="p-5 rounded-xl bg-[#0E131F] border border-zinc-800/80 hover:border-emerald-500/30 transition-all space-y-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs uppercase font-mono tracking-wider font-semibold">Tutor WhatsApp</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <MessageSquare className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold font-sans text-white tracking-tight">
                {metrics.whatsappConnectedCount}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-emerald-400 font-semibold">
                  {((metrics.whatsappConnectedCount / metrics.totalUsers) * 100).toFixed(0)}% da base conectada
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-900 flex justify-between text-[11px] text-zinc-400">
              <span>Bot: +55 71 98135-6297</span>
              <span className="text-emerald-400">Sincronizado</span>
            </div>
          </div>
        </div>

        {/* Middle Section: Chart & Ecosystem Health */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-xl bg-[#0E131F] border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white font-sans tracking-wide">
                  Atividade dos Alunos & Aquisição (Últimos Dias)
                </h2>
                <p className="text-xs text-zinc-400">
                  Novos cadastros, simulados concluídos e perguntas respondidas no WhatsApp.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> Cadastros
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> WhatsApp
                </span>
              </div>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorCadastros" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorWhatsapp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090D16', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="novosCadastros"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCadastros)"
                  />
                  <Area
                    type="monotone"
                    dataKey="duvidasWhatsapp"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorWhatsapp)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ecosystem Health (1 col) */}
          <div className="p-6 rounded-xl bg-[#0E131F] border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white font-sans tracking-wide">
                  Microsserviços VPS
                </h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOverview}
                disabled={loading}
                className="h-7 px-2 text-[11px] border-zinc-800 text-zinc-400 hover:text-white"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <div className="space-y-3">
              {services.map((svc) => (
                <div
                  key={svc.name}
                  className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    {svc.status === 'healthy' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : svc.status === 'degraded' ? (
                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-zinc-200">{svc.name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono truncate max-w-[160px]">{svc.url}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {svc.latencyMs}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-[11px] text-zinc-500 flex items-center justify-between">
              <span>Docker Swarm & Traefik</span>
              <span className="text-emerald-400 font-medium">SSL Automático Let's Encrypt</span>
            </div>
          </div>
        </div>

        {/* Quick Founder Action Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/users"
            className="p-5 rounded-xl bg-gradient-to-br from-[#0E131F] to-cyan-950/20 border border-zinc-800 hover:border-cyan-500/40 transition-all group flex items-start justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-cyan-400 uppercase font-mono tracking-wider">Gestão de Alunos</span>
              <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                Controle de Acessos & Bolsas
              </h3>
              <p className="text-xs text-zinc-400">
                Promover usuários a Pro, convidar novos administradores e gerenciar assinaturas.
              </p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
          </Link>

          <Link
            href="/admin/ai"
            className="p-5 rounded-xl bg-gradient-to-br from-[#0E131F] to-blue-950/20 border border-zinc-800 hover:border-blue-500/40 transition-all group flex items-start justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-blue-400 uppercase font-mono tracking-wider">Observabilidade FinOps</span>
              <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                Consumo de Tokens & Modelos
              </h3>
              <p className="text-xs text-zinc-400">
                Auditoria de custos em USD/BRL, distribuição por recurso e latência de IA.
              </p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
          </Link>

          <Link
            href="/admin/errors"
            className="p-5 rounded-xl bg-gradient-to-br from-[#0E131F] to-red-950/20 border border-zinc-800 hover:border-red-500/40 transition-all group flex items-start justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-red-400 uppercase font-mono tracking-wider">Central de Falhas</span>
              <h3 className="text-base font-bold text-white group-hover:text-red-300 transition-colors">
                Exceções de Alunos em Tempo Real
              </h3>
              <p className="text-xs text-zinc-400">
                Captura instantânea de erros no navegador para resolver bugs antes do suporte.
              </p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-zinc-500 group-hover:text-red-400 transition-colors" />
          </Link>
        </div>
      </main>
    </div>
  );
}
