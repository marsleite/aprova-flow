'use client';

import { useState, useEffect, useMemo } from 'react';
import { AdminHeader } from '@/components/admin/AdminNavigation';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  Shield,
  ShieldAlert,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UserPlus,
  Crown,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components';
import { auth } from '@/lib/firebase/config';
import { AdminUserListItem } from '@/app/api/admin/users/route';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'pro' | 'admin'>('all');
  const [bootstrapAdmins, setBootstrapAdmins] = useState<string[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal para convidar Admin
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(search)}&tier=${tierFilter}`, {
        headers: {
          Authorization: `Bearer ${idToken || ''}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        if (data.bootstrapAdmins) setBootstrapAdmins(data.bootstrapAdmins);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, tierFilter]);

  const handleSetTier = async (userId: string, newTier: 'free' | 'pro') => {
    setActionLoadingId(userId);
    setNotification(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken || ''}`,
        },
        body: JSON.stringify({
          action: 'set_tier',
          userId,
          newTier,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: `Plano alterado para ${newTier.toUpperCase()} com sucesso!` });
        // Atualiza estado local
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, tier: newTier, subscriptionStatus: newTier === 'pro' ? 'active' : 'expired' } : u))
        );
      } else {
        setNotification({ type: 'error', message: data.error || 'Erro ao alterar plano.' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro de conexão com o servidor.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeAdmin = async (email: string) => {
    if (!confirm(`Tem certeza que deseja revogar o acesso de administrador de ${email}?`)) return;
    setActionLoadingId(email);
    setNotification(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken || ''}`,
        },
        body: JSON.stringify({
          action: 'revoke_admin',
          email,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: data.message });
        setUsers((prev) =>
          prev.map((u) => (u.email.toLowerCase() === email.toLowerCase() ? { ...u, isAdmin: false, tier: u.tier === 'admin' ? 'pro' : u.tier } : u))
        );
      } else {
        setNotification({ type: 'error', message: data.error || 'Erro ao revogar admin.' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Falha de conexão.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@')) return;
    setInviteLoading(true);
    setNotification(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken || ''}`,
        },
        body: JSON.stringify({
          action: 'invite_admin',
          email: inviteEmail.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: data.message });
        setShowInviteModal(false);
        setInviteEmail('');
        fetchUsers();
      } else {
        setNotification({ type: 'error', message: data.error || 'Erro ao convidar admin.' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Erro na requisição.' });
    } finally {
      setInviteLoading(false);
    }
  };

  // Métricas agregadas
  const stats = useMemo(() => {
    const total = users.length;
    const pro = users.filter((u) => u.tier === 'pro' || u.tier === 'admin').length;
    const free = users.filter((u) => u.tier === 'free').length;
    const whats = users.filter((u) => u.whatsappLinked).length;
    return { total, pro, free, whats };
  }, [users]);

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader
        title="Gestão de Usuários & Acessos"
        subtitle="Controle de assinaturas Pro, papéis de administrador e vinculação de WhatsApp."
        rightElement={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={() => setShowInviteModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs shadow-lg shadow-cyan-500/20"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Convidar Admin
            </Button>
          </div>
        }
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Banner de Feedback */}
        {notification && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-sm animate-in fade-in duration-200 ${
              notification.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs text-zinc-400 hover:text-white underline ml-4"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-[#0B0F17]/90 border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Total de Contas</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-bold text-zinc-100 mt-2 font-mono">{stats.total}</p>
          </Card>

          <Card className="p-4 bg-[#0B0F17]/90 border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Assinantes Pro</span>
              <Crown className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400 mt-2 font-mono">{stats.pro}</p>
          </Card>

          <Card className="p-4 bg-[#0B0F17]/90 border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Usuários Free</span>
              <Sparkles className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-2xl font-bold text-zinc-300 mt-2 font-mono">{stats.free}</p>
          </Card>

          <Card className="p-4 bg-[#0B0F17]/90 border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">WhatsApp Vinculado</span>
              <Phone className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-zinc-100 mt-2 font-mono">{stats.whats}</p>
          </Card>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-[#0B0F17]/90 p-3 rounded-xl border border-zinc-800/80">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-zinc-500 hidden md:block" />
            <div className="flex rounded-lg bg-zinc-900 p-1 border border-zinc-800 w-full md:w-auto">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'pro', label: 'Pro' },
                  { id: 'free', label: 'Free' },
                  { id: 'admin', label: 'Admins' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTierFilter(tab.id)}
                  className={`flex-1 md:flex-initial px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    tierFilter === tab.id
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <Card className="bg-[#0B0F17]/90 border-zinc-800/80 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/60 text-zinc-400 text-xs uppercase font-mono tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Usuário</th>
                  <th className="py-3.5 px-4 font-semibold">Plano</th>
                  <th className="py-3.5 px-4 font-semibold">Acesso</th>
                  <th className="py-3.5 px-4 font-semibold">WhatsApp</th>
                  <th className="py-3.5 px-4 font-semibold">Cadastro</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      Nenhum usuário encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isBootstrap = u.isBootstrapAdmin || bootstrapAdmins.includes(u.email.toLowerCase());
                    const isPro = u.tier === 'pro';

                    return (
                      <tr key={u.id} className="hover:bg-zinc-900/40 transition-colors">
                        {/* Usuário */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300 uppercase">
                              {u.name ? u.name.charAt(0) : u.email.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-zinc-100 flex items-center gap-1.5">
                                {u.name || 'Sem nome'}
                                {isBootstrap && (
                                  <span title="Fundador / Imutável">
                                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                                <Mail className="w-3 h-3 text-zinc-600" />
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Plano */}
                        <td className="py-3.5 px-4">
                          {isPro ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <Crown className="w-3 h-3" />
                              PRO
                            </span>
                          ) : u.tier === 'admin' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                              <Shield className="w-3 h-3" />
                              ADMIN
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                              FREE
                            </span>
                          )}
                        </td>

                        {/* Papel */}
                        <td className="py-3.5 px-4">
                          {isBootstrap ? (
                            <span className="text-xs text-amber-300 font-mono font-medium">Fundador</span>
                          ) : u.isAdmin ? (
                            <span className="text-xs text-cyan-400 font-mono font-medium">Admin Convidado</span>
                          ) : (
                            <span className="text-xs text-zinc-500 font-mono">Aluno</span>
                          )}
                        </td>

                        {/* WhatsApp */}
                        <td className="py-3.5 px-4">
                          {u.whatsappLinked ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {u.phone ? `${u.phone.slice(-4)}` : 'Vinculado'}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600">Não vinculado</span>
                          )}
                        </td>

                        {/* Data */}
                        <td className="py-3.5 px-4 font-mono text-xs text-zinc-500">
                          {u.createdAt || '2026-10-01'}
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Alternar Pro/Free */}
                            {u.tier !== 'admin' && (
                              <button
                                disabled={actionLoadingId === u.id}
                                onClick={() => handleSetTier(u.id, isPro ? 'free' : 'pro')}
                                className={`text-xs px-2.5 py-1 rounded border transition-colors font-medium ${
                                  isPro
                                    ? 'border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-900/50'
                                    : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                                }`}
                              >
                                {actionLoadingId === u.id
                                  ? 'Salvando...'
                                  : isPro
                                  ? 'Rebaixar Free'
                                  : 'Promover Pro'}
                              </button>
                            )}

                            {/* Gerenciar Admin */}
                            {isBootstrap ? (
                              <span className="text-[11px] text-zinc-600 font-mono px-2 py-1">Imutável</span>
                            ) : u.isAdmin ? (
                              <button
                                disabled={actionLoadingId === u.email}
                                onClick={() => handleRevokeAdmin(u.email)}
                                className="text-xs px-2.5 py-1 rounded border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-medium"
                              >
                                {actionLoadingId === u.email ? '...' : 'Revogar Admin'}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal de Convidar Admin */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0D121F] border border-cyan-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-zinc-100">Convidar Novo Administrador</h3>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 text-sm"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Ao conceder permissão de administrador, o usuário terá acesso total ao cockpit executivo, telemetria de erros, custos de IA e controle de assinaturas em <span className="font-mono text-cyan-400">admin.aprovamind.com.br</span>.
              </p>

              <form onSubmit={handleInviteAdmin} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5 uppercase font-mono">
                    E-mail do Administrador
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ex: colega@gmail.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInviteModal(false)}
                    className="border-zinc-800 text-zinc-400 hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={inviteLoading}
                    className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold"
                  >
                    {inviteLoading ? 'Concedendo...' : 'Conceder Acesso Admin'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
