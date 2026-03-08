import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'premium';
    size?: 'sm' | 'md' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', asChild = false, disabled, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';

        // Base styles
        let classes = 'inline-flex items-center justify-center rounded-am-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-am-canvas ';

        // Size styles
        switch (size) {
            case 'sm':
                classes += 'h-8 px-3 text-am-caption ';
                break;
            case 'md':
                classes += 'h-10 px-4 text-am-body-sm ';
                break;
            case 'lg':
                classes += 'h-12 px-6 text-am-body-md ';
                break;
            case 'icon':
                classes += 'h-10 w-10 ';
                break;
        }

        // Variant styles
        switch (variant) {
            case 'primary':
                classes += 'bg-am-brand-primary text-white hover:bg-am-brand-primary-hover focus-visible:ring-am-brand-primary ';
                break;
            case 'secondary':
                classes += 'bg-am-surface-elevated text-am-text-primary border border-am-border-strong hover:bg-am-surface-subtle focus-visible:ring-am-border-strong ';
                break;
            case 'outline':
                classes += 'border border-am-border-default bg-transparent hover:bg-am-surface-subtle text-am-text-primary focus-visible:ring-am-border-default ';
                break;
            case 'ghost':
                classes += 'bg-transparent hover:bg-am-surface-subtle text-am-text-primary focus-visible:ring-am-border-default ';
                break;
            case 'danger':
                classes += 'bg-am-error/10 text-am-error hover:bg-am-error/20 border border-am-error/20 focus-visible:ring-am-error ';
                break;
            case 'premium':
                classes += 'bg-am-brand-gradient text-white hover:brightness-110 shadow-sm focus-visible:ring-am-brand-secondary rds-btn-identity ';
                break;
        }

        classes += className;

        return (
            <Comp
                className={classes}
                ref={ref}
                disabled={disabled}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

export { Button };
