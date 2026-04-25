'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Crown, Lock, Sparkles } from 'lucide-react';
import { Badge, Button } from '@/components';
import { getBetaUpgradeNarrative } from '@/lib/beta-plan-presentation';
import type { PlanTier } from '@/lib/entitlements';
import type { ProductEventMetadata } from '@/lib/product-events/types';
import { trackClientProductEvent } from '@/lib/product-events/client';

interface EntitlementUpgradeCardProps {
  title: string;
  description: string;
  highlight: string;
  recommendedPlan: 'pro' | 'premium';
  ctaHref?: string;
  ctaLabel?: string;
  currentPlan?: PlanTier;
  surface?: string;
  featureCode?: string;
  eventMetadata?: ProductEventMetadata;
}

export default function EntitlementUpgradeCard({
  title,
  description,
  highlight,
  recommendedPlan,
  ctaHref = '/settings',
  ctaLabel,
  currentPlan,
  surface,
  featureCode,
  eventMetadata,
}: EntitlementUpgradeCardProps) {
  const pathname = usePathname();
  const hasTrackedViewRef = useRef(false);
  const planNarrative = getBetaUpgradeNarrative(recommendedPlan);
  const resolvedCtaLabel = ctaLabel ?? planNarrative.ctaLabel;

  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;

    const basePayload = {
      route: pathname,
      surface,
      featureCode,
      recommendedPlan,
      planTier: currentPlan,
      ctaHref,
      metadata: {
        title,
        ...eventMetadata,
      },
    };

    void trackClientProductEvent({
      ...basePayload,
      eventName: 'feature_blocked',
    });
    void trackClientProductEvent({
      ...basePayload,
      eventName: 'upgrade_cta_viewed',
    });
  }, [ctaHref, currentPlan, eventMetadata, featureCode, pathname, recommendedPlan, surface, title]);

  const handleCtaClick = () => {
    void trackClientProductEvent({
      eventName: 'upgrade_cta_clicked',
      route: pathname,
      surface,
      featureCode,
      recommendedPlan,
      planTier: currentPlan,
      ctaHref,
      metadata: {
        title,
        ...eventMetadata,
      },
    });
  };

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
              {planNarrative.planLabel}
            </Badge>
            <Badge variant="outline" className="uppercase">
              {planNarrative.focusLabel}
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
            <span className="font-semibold">Destravando com {planNarrative.planLabel}:</span>{' '}
            {highlight}
          </div>
          <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
            {planNarrative.bridgeCopy}
          </p>
        </div>

        <div className="hidden rounded-full border border-border/50/40 bg-muted p-3 text-primary md:block">
          <Sparkles className="h-6 w-6" />
        </div>
      </div>

      <div className="relative z-10 mt-5">
        <Button asChild variant="premium">
          <Link href={ctaHref} onClick={handleCtaClick}>
            <Crown className="mr-2 h-4 w-4" />
            {resolvedCtaLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
}
