'use client';

import React, { useEffect, useRef } from 'react';
import Link, { type LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';
import type { PlanTier } from '@/lib/entitlements';
import { trackClientProductEvent } from '@/lib/product-events/client';
import type { ProductEventMetadata } from '@/lib/product-events/types';

interface TrackedUpgradeLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>,
    LinkProps {
  surface: string;
  recommendedPlan: 'pro';
  currentPlan?: PlanTier;
  featureCode?: string;
  eventMetadata?: ProductEventMetadata;
  trackBlockedView?: boolean;
}

function resolveHrefLabel(href: LinkProps['href']): string | null {
  if (typeof href === 'string') {
    return href;
  }

  if (typeof href === 'object' && typeof href.pathname === 'string') {
    return href.pathname;
  }

  return null;
}

const TrackedUpgradeLink = React.forwardRef<
  HTMLAnchorElement,
  TrackedUpgradeLinkProps
>(function TrackedUpgradeLink(
  {
    href,
    surface,
    recommendedPlan,
    currentPlan,
    featureCode,
    eventMetadata,
    trackBlockedView = true,
    onClick,
    children,
    ...props
  },
  ref
) {
  const pathname = usePathname();
  const hasTrackedViewRef = useRef(false);
  const ctaHref = resolveHrefLabel(href);

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
      metadata: eventMetadata,
    };

    if (trackBlockedView) {
      void trackClientProductEvent({
        ...basePayload,
        eventName: 'feature_blocked',
      });
    }

    void trackClientProductEvent({
      ...basePayload,
      eventName: 'upgrade_cta_viewed',
    });
  }, [
    ctaHref,
    currentPlan,
    eventMetadata,
    featureCode,
    pathname,
    recommendedPlan,
    surface,
    trackBlockedView,
  ]);

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (event.defaultPrevented) return;

    void trackClientProductEvent({
      eventName: 'upgrade_cta_clicked',
      route: pathname,
      surface,
      featureCode,
      recommendedPlan,
      planTier: currentPlan,
      ctaHref,
      metadata: eventMetadata,
    });
  };

  return (
    <Link
      {...props}
      href={href}
      ref={ref}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
});

TrackedUpgradeLink.displayName = 'TrackedUpgradeLink';

export default TrackedUpgradeLink;
