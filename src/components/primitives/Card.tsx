import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'glass' | 'ai';
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', variant = 'default', padding = 'md', ...props }, ref) => {
        let classes = 'rounded-am-xl overflow-hidden ';

        // Variant styles
        switch (variant) {
            case 'default':
                classes += 'bg-am-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] border border-am-border-default/50 ring-1 ring-white/5 ';
                break;
            case 'elevated':
                classes += 'bg-am-surface-elevated shadow-[0_8px_30px_rgb(0,0,0,0.4)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-am-border-strong ring-1 ring-white/10 ';
                break;
            case 'glass':
                classes += 'bg-am-surface/40 backdrop-blur-2xl border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ';
                break;
            case 'ai':
                classes += 'bg-am-surface border border-am-ai-border/20 shadow-[inset_0_1px_0_rgba(139,92,246,0.1)] relative overflow-hidden ';
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
                {props.children}
            </div>
        );
    }
);
Card.displayName = 'Card';

export { Card };
