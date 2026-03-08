import * as React from 'react';
import { Card, Skeleton } from '@/components';

export interface ChartCardProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    loading?: boolean;
    children: React.ReactNode;
    height?: number | string;
}

export function ChartCard({ title, subtitle, action, loading, children, height = 300 }: ChartCardProps) {
    return (
        <Card className="flex flex-col h-full transition-all duration-300" padding="none">
            <div className="flex items-center justify-between px-8 py-6">
                <div>
                    <h3 className="font-brand text-xl font-bold text-am-text-primary tracking-tight">{title}</h3>
                    {subtitle && <p className="mt-1.5 text-[10px] font-mono uppercase tracking-widest text-am-text-tertiary">{subtitle}</p>}
                </div>
                {action && <div>{action}</div>}
            </div>
            <div className="px-8 pb-8 flex-1 min-h-0 relative" style={{ height }}>
                {loading ? (
                    <Skeleton className="absolute inset-x-8 inset-y-0 bottom-8" />
                ) : (
                    <div className="h-full w-full">
                        {children}
                    </div>
                )}
            </div>
        </Card>
    );
}
