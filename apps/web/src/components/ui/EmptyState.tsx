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
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-muted/50">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-card border border-border shadow-am-sm mb-5 text-muted-foreground">
                <Icon className="h-8 w-8" />
            </div>
            <h3 className="font-sans text-am-body-lg font-bold text-foreground mb-2">{title}</h3>
            <p className="max-w-xs text-am-body-sm text-muted-foreground leading-relaxed mb-6">{description}</p>
            {action && action}
        </div>
    );
}
