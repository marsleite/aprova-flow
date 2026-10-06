'use client';

import React from 'react';
import Link from 'next/link';

interface AprovaMindLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  subtitle?: string;
  href?: string;
  className?: string;
}

const SIZE_MAP = {
  xs: { icon: 22, text: 'text-sm', sub: 'text-[8px]' },
  sm: { icon: 28, text: 'text-base', sub: 'text-[9px]' },
  md: { icon: 34, text: 'text-lg', sub: 'text-[10px]' },
  lg: { icon: 42, text: 'text-2xl', sub: 'text-xs' },
  xl: { icon: 56, text: 'text-3xl', sub: 'text-sm' },
};

/**
 * Official AprovaMind Vector Brand Icon
 * Concept: The Architectural Apex "A" with the Horizon Diamond Needle.
 */
export function AprovaMindIcon({
  size = 32,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AprovaMind Logo"
    >
      <defs>
        <linearGradient id="apmGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="45%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>

        <linearGradient id="apmNeedle" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="50%" stopColor="#fed7aa" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>

        <filter id="apmShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.4" />
        </filter>
      </defs>

      <g transform="translate(0, 10)">
        {/* Main "A" legs */}
        <path
          d="
            M 500, 180
            L 820, 790
            L 695, 790
            L 575, 550
            L 425, 550
            L 305, 790
            L 180, 790
            Z
          "
          fill="url(#apmGrad)"
        />

        {/* Inner negative space cutout triangle */}
        <polygon points="500, 345 425, 495 575, 495" fill="var(--background, #09090b)" />

        {/* Horizon Diamond Needle */}
        <path
          d="
            M 120, 520
            Q 320, 488, 500, 485
            Q 680, 488, 880, 520
            Q 680, 552, 500, 555
            Q 320, 552, 120, 520
            Z
          "
          fill="url(#apmNeedle)"
          filter="url(#apmShadow)"
        />
      </g>
    </svg>
  );
}

export default function AprovaMindLogo({
  size = 'md',
  showWordmark = true,
  subtitle,
  href,
  className = '',
}: AprovaMindLogoProps) {
  const cfg = SIZE_MAP[size] || SIZE_MAP.md;

  const content = (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon with container styling */}
      <div className="relative flex items-center justify-center p-1 rounded-xl bg-gradient-to-b from-orange-500/10 to-amber-500/5 border border-orange-500/20 shadow-sm shadow-orange-500/10">
        <AprovaMindIcon size={cfg.icon} />
      </div>

      {showWordmark && (
        <div className="flex flex-col justify-center leading-none">
          <span className={`font-bold tracking-tight text-foreground ${cfg.text}`}>
            Aprova<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">Mind</span>
          </span>
          {subtitle && (
            <span
              className={`mt-0.5 font-semibold uppercase tracking-[0.2em] text-muted-foreground ${cfg.sub}`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center group transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
