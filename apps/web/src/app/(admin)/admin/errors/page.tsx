'use client';

import { useState, useEffect, useMemo } from 'react';
import { AdminHeader } from '@/components/admin/AdminNavigation';
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  Clock,
  Filter,
  Globe,
  RefreshCw,
  Trash2,
  User,
  Terminal,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components';
import { auth } from '@/lib/firebase/config';
import { SystemErrorItem } from '@/app/api/admin/errors/route';

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<SystemErrorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/errors', {
        headers: {
          Authorization: `Bearer ${idToken || ''}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setErrors(data.errors || []);
      }
    } catch (err) {
      console.error('Erro ao buscar erros do APM:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, []);

  const handleResolve = async (errorId: string) => {
    setActionLoadingId(errorId);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken || ''}`,
        },
        body: JSON.stringify({ action: 'resolve', errorId }),
      });
      if (res.ok) {
        setErrors((prev) => prev.map((e) => (e.id === errorId ? { ...e, resolved: true } : e)));
      }
    } catch (err) {
      console.error('Falha ao resolver erro:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleClearResolved = async () => {
    if (!confirm('Deseja remover do histórico todas as exceções marcadas como resolvidas?')) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken || ''}`,
        },
        body: JSON.stringify({ action: 'clear_resolved' }),
      });
      if (res.ok) {
        setErrors((prev) => prev.filter((e) => !e.resolved));
      }
    } catch (err) {
      console.error('Falha ao limpar histórico:', err);
    }
  };

  const copyStack = (id: string, stack?: string) => {
    if (!stack) return;
    navigator.clipboard.writeText(stack);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const stats = useMemo(() => {
    const total = errors.length;
    const unresolved = errors.filter((e) => !e.resolved).length;
    const resolved = errors.filter((e) => e.resolved).length;
    return { total, unresolved, resolved };
  }, [errors]);

  const filteredErrors = useMemo(() => {
    if (filterStatus === 'unresolved') return errors.filter((e) => !e.resolved);
    if (filterStatus === 'resolved') return errors.filter((e) => e.resolved);
    return errors;
  }, [errors, filterStatus]);

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader
        title="Observabilidade & APM (Sentry Lite)"
        subtitle="Registro em tempo real de exceções no frontend, falhas de API e integridade dos microserviços."
        rightElement={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchErrors}
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              Atualizar
            </Button>
            {stats.resolved > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearResolved}
                className="border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-900/40 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Limpar Resolvidos
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* KPI Cards APM */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 bg-[#0B0F17]/90 border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Erros Não Resolvidos</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-bold text-rose-400 mt-2 font-mono">{stats.unresolved}</p>
            <p className="text-[11px] text-zinc-500 mt-1">Exigem atenção imediata</p>
          </Card>

          <Card className="p-4 bg-[#0B0F17]/90 border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Total Registrado</span>
              <Bug className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-zinc-200 mt-2 font-mono">{stats.total}</p>
            <p className="text-[11px] text-zinc-500 mt-1">Nesta sessão em memória</p>
          </Card>

          <Card className="p-4 bg-[#0B0F17]/90 border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Erros Sanados</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400 mt-2 font-mono">{stats.resolved}</p>
            <p className="text-[11px] text-zinc-500 mt-1">Problemas resolvidos</p>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex items-center justify-between bg-[#0B0F17]/90 p-3 rounded-xl border border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <span className="text-xs text-zinc-400 font-semibold uppercase font-mono">Filtrar por Status:</span>
          </div>

          <div className="flex rounded-lg bg-zinc-900 p-1 border border-zinc-800">
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'unresolved', label: 'Não Resolvidos' },
                { id: 'resolved', label: 'Resolvidos' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                  filterStatus === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feed de Erros */}
        <div className="space-y-3">
          {filteredErrors.length === 0 ? (
            <Card className="p-12 text-center bg-[#0B0F17]/90 border-zinc-800/80">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-zinc-200">Nenhuma exceção pendente!</h4>
              <p className="text-xs text-zinc-500 mt-1">O sistema está operando sem falhas reportadas no momento.</p>
            </Card>
          ) : (
            filteredErrors.map((err) => {
              const isExpanded = expandedId === err.id;

              return (
                <Card
                  key={err.id}
                  className={`bg-[#0B0F17]/95 border transition-all ${
                    err.resolved
                      ? 'border-zinc-800/60 opacity-75'
                      : 'border-rose-900/40 hover:border-rose-700/60 shadow-lg shadow-rose-950/20'
                  }`}
                >
                  <div className="p-4 md:p-5 space-y-3">
                    {/* Header do Erro */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {err.resolved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Resolvido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            Pendente
                          </span>
                        )}

                        <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {err.source}
                        </span>

                        <span className="text-xs text-zinc-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {err.timestamp}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!err.resolved && (
                          <Button
                            size="sm"
                            disabled={actionLoadingId === err.id}
                            onClick={() => handleResolve(err.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-7 px-3"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Marcar Resolvido
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Mensagem Principal */}
                    <div>
                      <p className="text-sm font-mono font-semibold text-rose-300 break-words">{err.message}</p>
                    </div>

                    {/* Metadados: URL e Usuário */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 font-mono">
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Globe className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-zinc-300">{err.url}</span>
                      </div>
                      {err.userEmail && (
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-cyan-400">{err.userEmail}</span>
                        </div>
                      )}
                    </div>

                    {/* Stack Trace Accordion */}
                    {err.stack && (
                      <div className="pt-2">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : err.id)}
                          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 font-mono transition-colors"
                        >
                          <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{isExpanded ? 'Ocultar Stack Trace' : 'Ver Stack Trace'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 relative">
                            <pre className="p-3 bg-black/60 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              {err.stack}
                            </pre>
                            <button
                              onClick={() => copyStack(err.id, err.stack)}
                              className="absolute top-2 right-2 p-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 border border-zinc-700"
                              title="Copiar stack"
                            >
                              {copiedId === err.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-[10px] text-emerald-400">Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-zinc-400" />
                                  <span className="text-[10px]">Copiar</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
