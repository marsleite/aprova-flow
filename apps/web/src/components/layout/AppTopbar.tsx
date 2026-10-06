'use client';

import * as React from 'react';
import { Menu, Zap } from 'lucide-react';
import { Button } from '@/components';
import { ThemeToggle } from '@/components/ThemeToggle';
import AprovaMindLogo from '@/components/brand/AprovaMindLogo';

export function AppTopbar({ onMenuToggle }: { onMenuToggle: () => void }) {
    // We'll wire PlanSelector here later; for now, keeping it clean as per phase 1 definition
    return (
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-8">
            {/* Mobile left side */}
            <div className="flex items-center gap-3 lg:hidden">
                <Button variant="ghost" size="icon" onClick={onMenuToggle} className="-ml-2">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Abrir menu</span>
                </Button>
                <AprovaMindLogo size="xs" href="/dashboard" />
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
