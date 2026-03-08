export const space = {
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',    // 40px
    12: '3rem',      // 48px
    16: '4rem',      // 64px
} as const;

export const radius = {
    sm: '0.5rem',    // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.25rem',   // 20px
    pill: '9999px',
} as const;

export const shadowLight = {
    sm: '0 1px 2px rgba(2,6,23,0.06)',
    md: '0 8px 24px rgba(2,6,23,0.08)',
    lg: '0 16px 40px rgba(2,6,23,0.10)',
} as const;

export const shadowDark = {
    sm: '0 1px 2px rgba(0,0,0,0.30)',
    md: '0 10px 30px rgba(0,0,0,0.35)',
    lg: '0 18px 44px rgba(0,0,0,0.45)',
} as const;
