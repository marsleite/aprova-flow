'use client';

import Link from 'next/link';
import { Crown, Lock, Sparkles } from 'lucide-react';
import { Badge, Button } from '@/components';

interface EntitlementUpgradeCardProps {
  title: string;
  description: string;
  highlight: string;
  recommendedPlan: 'pro' | 'premium';
  ctaHref?: string;
  ctaLabel?: string;
}

export default function EntitlementUpgradeCard({
  title,
  description,
  highlight,
  recommendedPlan,
  ctaHref = '/settings',
  ctaLabel = 'Ver plano',
}: EntitlementUpgradeCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border/50/40 bg-card p-6 shadow-am-md"
      style={{
        background:
          'linear-gradient(135deg, var(--color-am-surface) 0%, rgba(139, 92, 246, 0.06) 100%)',
      }}
    >
      <div className="absolute right-0 top-0 h-32 w-32 bg-am-ai-glow/15 blur-[70px]" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="ai">
              <Lock className="mr-1 h-3 w-3" />
              Recurso protegido
            </Badge>
            <Badge variant="outline" className="uppercase">
              {recommendedPlan}
            </Badge>
          </div>

          <div>
            <h3 className="font-sans text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="mt-2 max-w-xl text-am-body-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="rounded-md border border-border bg-muted px-4 py-3 text-am-body-sm text-foreground">
            <span className="font-semibold">Destravando com {recommendedPlan}:</span>{' '}
            {highlight}
          </div>
        </div>

        <div className="hidden rounded-full border border-border/50/40 bg-muted p-3 text-primary md:block">
          <Sparkles className="h-6 w-6" />
        </div>
      </div>

      <div className="relative z-10 mt-5">
        <Button asChild variant="premium">
          <Link href={ctaHref}>
            <Crown className="mr-2 h-4 w-4" />
            {ctaLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
}
