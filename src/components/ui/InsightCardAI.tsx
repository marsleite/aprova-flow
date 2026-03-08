import * as React from 'react';
import { Card, Badge, Button, Skeleton } from '@/components';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export interface InsightCardAIProps {
    diagnosis: string;
    recommendation: string;
    confidence?: number;
    ctaText?: string;
    ctaHref?: string;
    loading?: boolean;
}

export function InsightCardAI({ diagnosis, recommendation, confidence, ctaText, ctaHref, loading }: InsightCardAIProps) {
    return (
        <Card variant="ai" padding="lg" className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <Badge variant="ai">AI INSIGHT</Badge>
                {confidence !== undefined && (
                    <span className="text-am-caption font-semibold text-am-ai-default font-mono">
                        {confidence}% CONFIANÇA
                    </span>
                )}
            </div>

            {loading ? (
                <div className="space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            ) : (
                <div className="space-y-3 flex-1">
                    <p className="font-brand text-am-body-lg font-bold text-am-text-primary leading-snug">
                        {diagnosis}
                    </p>
                    <p className="text-am-body-sm text-am-text-secondary leading-relaxed">
                        {recommendation}
                    </p>
                </div>
            )}

            {ctaText && ctaHref && !loading && (
                <div className="pt-2 mt-auto">
                    <Button asChild variant="premium" className="w-full">
                        <Link href={ctaHref}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            {ctaText}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            )}
        </Card>
    );
}
