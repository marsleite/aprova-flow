import * as React from 'react';

function Skeleton({
    className = '',
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`animate-pulse rounded-am-md bg-am-surface-subtle ${className}`}
            {...props}
        />
    );
}

export { Skeleton };
