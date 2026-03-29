import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'glass' | 'ai';
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', variant = 'default', padding = 'md', ...props }, ref) => {
        let classes = 'rounded-[24px] overflow-hidden ';

        // Variant styles — Sitetrip DS
        switch (variant) {
            case 'default':
                classes += 'bg-card border border-border ';
                break;
            case 'elevated':
                classes += 'bg-card shadow-xl border border-border ';
                break;
            case 'glass':
                classes += 'backdrop-blur-2xl border border-border ';
                break;
            case 'ai':
                classes += 'bg-card border border-border/50/30 relative overflow-hidden ';
                break;
        }

        // Padding styles
        switch (padding) {
            case 'none': break;
            case 'sm':
                classes += 'p-4 ';
                break;
            case 'md':
                classes += 'p-6 ';
                break;
            case 'lg':
                classes += 'p-8 ';
                break;
        }

        classes += className;

        return (
            <div ref={ref} className={classes} {...props}>
                {/* Adds the subtle top gradient line for AI cards */}
                {variant === 'ai' && (
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-am-brand-gradient opacity-80" />
                )}
                {/* Glass background fill */}
                {variant === 'glass' && (
                    <div
                        className="absolute inset-0 -z-10"
                        style={{ background: 'rgba(253, 252, 251, 0.04)' }}
                    />
                )}
                {props.children}
            </div>
        );
    }
);
Card.displayName = 'Card';

export { Card };
