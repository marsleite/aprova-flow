import * as React from 'react';

export function EmptyState({
    icon: Icon,
    title,
    description,
    action
}: {
    icon: React.ElementType,
    title: string,
    description: string,
    action?: React.ReactNode
}) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-am-xl border border-dashed border-am-border-strong bg-am-surface-subtle/50">
            <div className="flex h-16 w-16 items-center justify-center rounded-am-xl bg-am-surface border border-am-border-default shadow-am-sm mb-5 text-am-text-tertiary">
                <Icon className="h-8 w-8" />
            </div>
            <h3 className="font-brand text-am-body-lg font-bold text-am-text-primary mb-2">{title}</h3>
            <p className="max-w-xs text-am-body-sm text-am-text-secondary leading-relaxed mb-6">{description}</p>
            {action && action}
        </div>
    );
}
