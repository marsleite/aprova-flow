'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Timer,
    CalendarDays,
    Sparkles,
    BarChart2,
    History,
    Settings,
    LogOut,
    Zap,
} from 'lucide-react';

interface SidebarItemProps {
    href: string;
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    isAi?: boolean;
}

function SidebarItem({ href, icon: Icon, label, isActive, isAi }: SidebarItemProps) {
    return (
        <Link
            href={href}
            className={`
        group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-am-body-sm transition-all duration-200
        ${isActive
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }
      `}
        >
            {/* Active Indicator Line */}
            {isActive && (
                <div className={`absolute left-0 top-1/2 h-2/3 w-[3px] -translate-y-1/2 rounded-r-am-sm ${isAi ? 'bg-primary' : 'bg-primary'}`} />
            )}

            <Icon className={`h-4 w-4 transition-colors ${isActive ? (isAi ? 'text-primary' : 'text-primary') : 'text-muted-foreground group-hover:text-muted-foreground'}`} />

            <span className="flex-1">{label}</span>

            {isAi && (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-am-ai-subtle border border-border/50">
                    <Sparkles className="h-2.5 w-2.5 text-primary" />
                </div>
            )}
        </Link>
    );
}

const NAV_ITEMS = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/engine', icon: Timer, label: 'Sessão de Estudo' },
    { href: '/planner', icon: CalendarDays, label: 'Planner' },
    { href: '/mentoring', icon: Sparkles, label: 'Mentoria', isAi: true },
];

const SECONDARY_ITEMS = [
    { href: '/analytics', icon: BarChart2, label: 'Análises' },
    { href: '/history', icon: History, label: 'Histórico' },
];

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col border-r border-border bg-background">
            {/* Logo Area */}
            <div className="flex h-16 shrink-0 items-center px-6">
                <Link href="/dashboard" className="flex items-center gap-2 group">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-am-brand-gradient shadow-am-sm transition-transform duration-300 group-hover:scale-105">
                        <Zap className="h-4 w-4 text-foreground" />
                    </div>
                    <span className="font-sans text-lg font-bold text-foreground tracking-tighter">
                        Aprova<span className="text-am-text-brand">Mind</span>
                    </span>
                </Link>
            </div>

            {/* Main Nav */}
            <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
                <div className="space-y-1">
                    <p className="px-3 pb-2 text-am-caption font-semibold uppercase tracking-wider text-muted-foreground">Principal</p>
                    {NAV_ITEMS.map((item) => (
                        <SidebarItem
                            key={item.href}
                            href={item.href}
                            icon={item.icon}
                            label={item.label}
                            isActive={pathname.startsWith(item.href)}
                            isAi={item.isAi}
                        />
                    ))}
                </div>

                <div className="mt-8 space-y-1">
                    <p className="px-3 pb-2 text-am-caption font-semibold uppercase tracking-wider text-muted-foreground">Evolução</p>
                    {SECONDARY_ITEMS.map((item) => (
                        <SidebarItem
                            key={item.href}
                            href={item.href}
                            icon={item.icon}
                            label={item.label}
                            isActive={pathname.startsWith(item.href)}
                        />
                    ))}
                </div>
            </div>

            {/* Footer Area */}
            <div className="border-t border-border p-4">
                <div className="space-y-1">
                    <SidebarItem href="/settings" icon={Settings} label="Configurações" isActive={pathname.startsWith('/settings')} />
                    <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-am-body-sm text-muted-foreground hover:bg-am-error/5 hover:text-am-error transition-colors">
                        <LogOut className="h-4 w-4 text-muted-foreground" />
                        <span>Sair da conta</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
