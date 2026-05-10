import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', asChild = false, disabled, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';

        // Base styles — Flux Concept v3.0 brutalist structure
        let classes = 'inline-flex items-center justify-center font-semibold uppercase tracking-widest transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none rounded-sm ';

        // Size styles
        switch (size) {
            case 'sm':
                classes += 'h-10 px-5 text-[10px] gap-2 ';
                break;
            case 'md':
                classes += 'h-12 px-6 text-xs gap-2 ';
                break;
            case 'lg':
                classes += 'h-14 px-8 text-xs gap-3 ';
                break;
            case 'icon':
                classes += 'h-12 w-12 text-xs ';
                break;
        }

        // Variant styles — Flux brand
        switch (variant) {
            case 'primary':
                classes += 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:opacity-90 ';
                break;
            case 'secondary':
                classes += 'bg-card text-foreground border border-border hover:border-primary/50 ';
                break;
            case 'outline':
            case 'ghost':
                classes += 'border border-border text-muted-foreground hover:bg-foreground hover:text-background hover:border-foreground ';
                break;
            case 'danger':
                classes += 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 ';
                break;
        }

        return (
            <Comp
                className={`${classes} ${className}`}
                ref={ref}
                disabled={disabled}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

export { Button };
