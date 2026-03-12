import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'ai' | 'outline';
    size?: 'sm' | 'md';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className = '', variant = 'default', size = 'sm', ...props }, ref) => {
        let classes = 'inline-flex items-center font-semibold rounded-full transition-colors ';

        // Size — DS chip sizing
        switch (size) {
            case 'sm':
                classes += 'px-2.5 py-0.5 text-[10px] uppercase tracking-wider gap-1.5 ';
                break;
            case 'md':
                classes += 'px-3 py-1 text-am-caption gap-2 ';
                break;
        }

        // Variant — Sitetrip accent colors
        switch (variant) {
            case 'default':
                classes += 'bg-am-surface-subtle text-am-text-secondary border border-am-border-default ';
                break;
            case 'primary':
                classes += 'bg-am-brand-primary/10 text-am-brand-primary border border-am-brand-primary/20 ';
                break;
            case 'success':
                classes += 'bg-am-success/10 text-am-success border border-am-success/20 ';
                break;
            case 'warning':
                classes += 'bg-am-warning/10 text-am-warning border border-am-warning/20 ';
                break;
            case 'error':
                classes += 'bg-am-error/10 text-am-error border border-am-error/20 ';
                break;
            case 'ai':
                classes += 'bg-am-ai-subtle text-am-brand-secondary border border-am-ai-border ';
                break;
            case 'outline':
                classes += 'bg-transparent text-am-text-secondary border border-am-border-strong ';
                break;
        }

        classes += className;

        return (
            <div ref={ref} className={classes} {...props} />
        );
    }
);
Badge.displayName = 'Badge';

export { Badge };
