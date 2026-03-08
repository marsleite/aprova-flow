/**
 * AprovaMind Design System — Typography Tokens
 *
 * Source of truth: APROVAMIND_REBRANDING_GUIDE.md §14 & §20.7
 */

export const fontFamily = {
    base: 'var(--font-inter), system-ui, -apple-system, sans-serif',
    display: 'var(--font-geist-sans), system-ui, sans-serif',
    mono: 'var(--font-geist-mono), ui-monospace, monospace',
} as const;

export const fontSize = {
    display: '2.5rem',    // 40px
    h1: '2rem',      // 32px
    h2: '1.75rem',   // 28px
    h3: '1.5rem',    // 24px
    h4: '1.25rem',   // 20px
    bodyLg: '1rem',      // 16px
    bodyMd: '0.875rem',  // 14px
    bodySm: '0.8125rem', // 13px
    caption: '0.75rem',   // 12px
} as const;

export const fontWeight = {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
} as const;

export const lineHeight = {
    tight: '1.2',
    snug: '1.35',
    normal: '1.5',
    relaxed: '1.625',
} as const;

export const letterSpacing = {
    tighter: '-0.02em',
    tight: '-0.01em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
} as const;
