'use client';

import * as React from 'react';
import { Menu, Zap } from 'lucide-react';
import { Button } from '@/components';
import { ThemeToggle } from '@/components/ThemeToggle';

export function AppTopbar({ onMenuToggle }: { onMenuToggle: () => void }) {
    // We'll wire PlanSelector here later; for now, keeping it clean as per phase 1 definition
    return (
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-am-border-default bg-am-bg-canvas/80 px-4 backdrop-blur-md lg:px-8">
            {/* Mobile left side */}
            <div className="flex items-center gap-3 lg:hidden">
                <Button variant="ghost" size="icon" onClick={onMenuToggle} className="-ml-2">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Abrir menu</span>
                </Button>
                <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-am-sm bg-am-brand-gradient">
                        <Zap className="h-3.5 w-3.5 text-am-text-primary" />
                    </div>
                    <span className="font-brand text-sm font-bold text-am-text-primary tracking-tighter">
                        Aprova<span className="text-am-text-brand">Mind</span>
                    </span>
                </div>
            </div>

            {/* Desktop empty spacer for left / Future title */}
            <div className="hidden lg:flex items-center gap-4">
                {/* We can inject Context (Current Plan) here in Phase 3 */}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
                <ThemeToggle />
                {/* Placeholder for User Profile / Avatar / Notification Bell */}
            </div>
        </div>
    );
}
