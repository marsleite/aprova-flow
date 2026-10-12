'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Brain,
  AlertTriangle,
  ExternalLink,
  LogOut,
  ShieldCheck,
  Server,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components';

const NAV_ITEMS = [
  {
    label: 'Visão Geral',
    href: '/admin',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    label: 'Usuários & Roles',
    href: '/admin/users',
    icon: Users,
    badge: null,
  },
  {
    label: 'FinOps & IA',
    href: '/admin/ai',
    icon: Brain,
    badge: 'LLM',
  },
  {
    label: 'Central de Erros',
    href: '/admin/errors',
    icon: AlertTriangle,
    badge: 'APM',
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthContext();

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0A0D14] border-r border-zinc-800/80 flex flex-col justify-between min-h-screen text-zinc-300">
      <div className="flex flex-col">
        {/* Brand header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-zinc-800/80">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              AM
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white font-sans">
                AprovaMind
              </span>
              <span className="text-[10px] text-cyan-400 font-mono tracking-wider font-semibold">
                ADMIN COCKPIT
              </span>
            </div>
          </Link>
          <Badge variant="outline" className="text-[9px] uppercase font-mono border-cyan-500/30 text-cyan-400 bg-cyan-500/5">
            v2.0
          </Badge>
        </div>

        {/* Quick status bar */}
        <div className="px-6 py-3 bg-zinc-950/60 border-b border-zinc-900 flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Oracle VPS
          </span>
          <span className="text-emerald-400 font-semibold">ONLINE</span>
        </div>

        {/* Navigation links */}
        <nav className="p-4 space-y-1">
          <p className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold">
            Operações do Sistema
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer user profile */}
      <div className="p-4 border-t border-zinc-800/80 space-y-3 bg-zinc-950/40">
        <Link
          href="https://aprovamind.com.br/dashboard"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80 transition-colors border border-transparent hover:border-zinc-800"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
            App Aluno
          </span>
          <span className="text-[10px] text-zinc-500">aprovamind.com.br</span>
        </Link>

        <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 text-xs font-bold shrink-0">
              {(user?.displayName || user?.email || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.displayName?.split(' ')[0] || 'Admin'}
              </p>
              <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Sair do Admin"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function AdminHeader({
  title,
  subtitle,
  rightElement,
}: {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}) {
  return (
    <header className="min-h-16 py-3 px-6 md:px-8 border-b border-zinc-800/80 bg-[#0A0D14]/70 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
      <div>
        <h1 className="text-base font-bold text-white tracking-tight font-sans flex items-center gap-2">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {rightElement}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400 font-mono">
          <Server className="h-3.5 w-3.5 text-cyan-400" />
          <span>Oracle Cloud Always Free</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Superadmin</span>
        </div>
      </div>
    </header>
  );
}
