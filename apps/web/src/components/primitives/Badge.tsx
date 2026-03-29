import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'ai' | 'outline';
    size?: 'sm' | 'md';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className = '', variant = 'default', size = 'sm', ...props }, ref) => {
        let classes = 'inline-flex items-center font-medium transition-colors border ';

        // Size 
        switch (size) {
            case 'sm':
                classes += 'px-3 py-1 text-[10px] uppercase tracking-widest gap-1.5 ';
                break;
            case 'md':
                classes += 'px-4 py-1.5 text-xs uppercase tracking-widest gap-2 ';
                break;
        }

        // Variant 
        switch (variant) {
            case 'default':
                classes += 'bg-transparent text-muted-foreground border-border ';
                break;
            case 'primary':
                classes += 'bg-primary/10 text-primary border-primary/20 ';
                break;
            case 'success':
                classes += 'bg-green-500/10 text-green-500 border-green-500/20 ';
                break;
            case 'warning':
                classes += 'bg-orange-500/10 text-orange-500 border-orange-500/20 ';
                break;
            case 'error':
                classes += 'bg-red-500/10 text-red-500 border-red-500/20 ';
                break;
            case 'ai':
                classes += 'bg-primary/5 text-primary border-primary/20 ';
                break;
            case 'outline':
                classes += 'bg-transparent text-muted-foreground border-border ';
                break;
        }

        return (
            <div ref={ref} className={`${classes} ${className}`} {...props} />
        );
    }
);
Badge.displayName = 'Badge';

export { Badge };
