'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, Crown } from 'lucide-react';
import type { AiQuotaNoticeData } from '@/lib/ai/quota-feedback';
import { trackClientProductEvent } from '@/lib/product-events/client';
import type { ProductEventMetadata } from '@/lib/product-events/types';

interface AiQuotaNoticeProps {
  notice: AiQuotaNoticeData;
  className?: string;
  surface?: string;
  featureCode?: string;
  eventMetadata?: ProductEventMetadata;
}

export default function AiQuotaNotice({
  notice,
  className = '',
  surface,
  featureCode,
  eventMetadata,
}: AiQuotaNoticeProps) {
  const pathname = usePathname();
  const hasTrackedViewRef = useRef(false);
  const resolvedSurface =
    surface ?? (notice.task ? `ai_quota_notice:${notice.task}` : 'ai_quota_notice');
  const resolvedFeatureCode = featureCode ?? notice.featureCode;

  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;

    const metadata: ProductEventMetadata = {
      title: notice.title,
      task: notice.task,
      limit: notice.limit,
      window: notice.window,
      retryAfterSeconds: notice.retryAfterSeconds ?? null,
      ...eventMetadata,
    };

    void trackClientProductEvent({
      eventName: 'feature_blocked',
      route: pathname,
      surface: resolvedSurface,
      featureCode: resolvedFeatureCode,
      recommendedPlan: notice.recommendedPlan,
      planTier: notice.planTier,
      ctaHref: notice.ctaHref,
      metadata,
    });

    if (!notice.ctaLabel || !notice.ctaHref) return;

    void trackClientProductEvent({
      eventName: 'upgrade_cta_viewed',
      route: pathname,
      surface: resolvedSurface,
      featureCode: resolvedFeatureCode,
      recommendedPlan: notice.recommendedPlan,
      planTier: notice.planTier,
      ctaHref: notice.ctaHref,
      metadata,
    });
  }, [
    eventMetadata,
    notice.ctaHref,
    notice.ctaLabel,
    notice.limit,
    notice.planTier,
    notice.recommendedPlan,
    notice.retryAfterSeconds,
    notice.task,
    notice.title,
    notice.window,
    pathname,
    resolvedFeatureCode,
    resolvedSurface,
  ]);

  const handleCtaClick = () => {
    if (!notice.ctaLabel || !notice.ctaHref) return;

    void trackClientProductEvent({
      eventName: 'upgrade_cta_clicked',
      route: pathname,
      surface: resolvedSurface,
      featureCode: resolvedFeatureCode,
      recommendedPlan: notice.recommendedPlan,
      planTier: notice.planTier,
      ctaHref: notice.ctaHref,
      metadata: {
        title: notice.title,
        task: notice.task,
        limit: notice.limit,
        window: notice.window,
        retryAfterSeconds: notice.retryAfterSeconds ?? null,
        ...eventMetadata,
      },
    });
  };

  return (
    <div
      className={`rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 ${className}`.trim()}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div className="space-y-1.5">
          <p className="font-semibold text-amber-200">{notice.title}</p>
          <p className="leading-relaxed">{notice.message}</p>
          {notice.detail && (
            <p className="text-xs leading-relaxed text-amber-100/85">
              {notice.detail}
            </p>
          )}
          {notice.ctaLabel && notice.ctaHref && (
            <Link
              href={notice.ctaHref}
              onClick={handleCtaClick}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200 underline underline-offset-4 hover:text-white"
            >
              <Crown className="h-3.5 w-3.5" />
              {notice.ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
