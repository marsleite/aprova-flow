/**
 * AprovaMind Design System — Color Tokens
 *
 * Source of truth: APROVAMIND_REBRANDING_GUIDE.md §13 & §20
 */

export const aprovaBlue = {
    50: '#EEF4FF',
    100: '#D9E7FF',
    200: '#BAD2FF',
    300: '#8CB4FF',
    400: '#5E93FF',
    500: '#3D74F6',
    600: '#2E5ED9',
    700: '#254AAD',
    800: '#213F8A',
    900: '#1E376F',
} as const;

export const mindViolet = {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: 'var(--primary)',
    500: 'var(--primary)',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
} as const;

export const neutral = {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
    950: '#09090B', // Zinc pure dark
} as const;

export const semantic = {
    success: '#10B981', // Emerald 500
    warning: '#F59E0B', // Amber 500
    error: '#EF4444',   // Red 500
    info: 'var(--primary)',    // Blue 500
} as const;

export const brand = {
    primary: aprovaBlue[600],
    primaryHover: aprovaBlue[500],
    secondary: mindViolet[500],
    secondaryHover: mindViolet[400],
    gradient: {
        start: aprovaBlue[600],
        end: mindViolet[600],
    },
} as const;

export const ai = {
    default: mindViolet[500],
    subtle: 'transparent',
    border: mindViolet[300],
    glow: 'rgba(139, 92, 246, 0.25)',
} as const;
