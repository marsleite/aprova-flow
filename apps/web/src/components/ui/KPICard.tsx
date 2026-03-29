import * as React from 'react';
import { Card, Skeleton } from '@/components';

export interface KPICardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    delta?: {
        value: number;
        trend: 'up' | 'down' | 'neutral';
        label?: string;
    };
    loading?: boolean;
    variant?: 'default' | 'ai';
}

export function KPICard({ title, value, icon: Icon, delta, loading, variant = 'default' }: KPICardProps) {
    return (
        <Card variant={variant} padding="lg" className="flex flex-col justify-between min-h-[160px] transition-all duration-300 hover:bg-card group">
            <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{title}</span>
                <div className={`flex items-center justify-center transition-colors ${variant === 'ai' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`}>
                    <Icon className="h-4 w-4" opacity={0.5} />
                </div>
            </div>

            <div className="mt-auto">
                {loading ? (
                    <Skeleton className="h-12 w-32 mb-1" />
                ) : (
                    <div className="flex flex-col gap-1">
                        <span className="font-sans text-5xl font-light tracking-tighter text-foreground leading-none">{value}</span>
                        {delta && (
                            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mt-2 ${delta.trend === 'up' ? 'text-green-500' : delta.trend === 'down' ? 'text-am-error' : 'text-muted-foreground'
                                }`}>
                                {delta.trend === 'up' && '+'}
                                {delta.trend === 'down' && '-'}
                                {delta.value}%
                                {delta.label && <span className="font-normal text-muted-foreground ml-1 lowercase tracking-normal">{delta.label}</span>}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}
