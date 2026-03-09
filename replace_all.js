const fs = require('fs');
const files = [
    'src/app/(app)/planner/page.tsx',
    'src/components/PlanManager.tsx',
    'src/components/engine/PortfolioOverviewCard.tsx',
    'src/components/engine/PlanEngineSnapshotCard.tsx',
    'src/components/SmartScheduleCard.tsx',
    'src/components/InsightsPanel.tsx'
];

const replacements = [
    // Legacy am- tokens from OLD system (if any sneaked in)
    ['text-text-strong', 'text-am-text-primary'],
    ['text-text-muted', 'text-am-text-secondary'],
    ['text-text-soft', 'text-am-text-tertiary'],
    ['text-text', 'text-am-text-primary'],
    ['bg-surface-1', 'bg-am-canvas'],
    ['bg-surface-2', 'bg-am-surface'],
    ['bg-surface-3', 'bg-am-surface-subtle'],
    ['bg-surface-elevated', 'bg-am-surface-elevated'],
    ['border-line-soft', 'border-am-border-default'],
    ['border-line-mid', 'border-am-border-strong'],
    ['border-line-strong', 'border-am-border-strong'],
    ['text-brand-500', 'text-am-brand-primary'],
    ['bg-brand-500', 'bg-am-brand-primary'],

    // Hardcoded grays
    ['bg-gray-950', 'bg-am-surface'],
    ['bg-gray-900', 'bg-am-surface-elevated'],
    ['bg-gray-800', 'bg-am-surface-subtle'],
    ['bg-gray-50', 'bg-am-surface-subtle'],
    ['text-gray-900', 'text-am-text-primary'],
    ['text-gray-800', 'text-am-text-secondary'],
    ['text-gray-500', 'text-am-text-tertiary'],
    ['text-gray-600', 'text-am-text-secondary'],
    ['text-gray-400', 'text-am-text-secondary'],
    ['text-gray-300', 'text-am-text-primary'],
    ['border-gray-800', 'border-am-border-default'],
    ['border-gray-200', 'border-am-border-default'],

    // Violets and exact hexes to AM tokens
    ['text-violet-500', 'text-am-brand-primary'],
    ['text-violet-400', 'text-am-brand-primary'],
    ['text-violet-300', 'text-am-brand-secondary'],
    ['border-violet-500', 'border-am-brand-primary'],
    ['bg-violet-500', 'bg-am-brand-primary'],
    ['text-[#F59768]', 'text-am-brand-secondary'],
    ['bg-[#3150AA]', 'bg-am-brand-primary'],
    ['text-[#3150AA]', 'text-am-brand-primary'],
    ['from-[#F59768] to-[#3150AA]', 'from-am-brand-secondary to-am-brand-primary'],
    ['shadow-[#3150AA]', 'shadow-am-brand-primary'],

    // Hard pixel typographies
    ['text-[2.8rem]', 'text-5xl font-light'],
    ['text-[1.8rem]', 'text-3xl'],
    ['text-[1.4rem]', 'text-xl'],
    ['text-[1.2rem]', 'text-lg'],
    ['text-[0.96rem]', 'text-am-body-sm'],
    ['text-[0.9rem]', 'text-sm'],
    ['text-[15px]', 'text-sm'],
    ['text-[13px]', 'text-xs'],
    ['text-[11px]', 'text-[10px]'],

    // Specific glow
    ['hover:scale-105', 'hover:scale-105 transition-transform'],
];

for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        for (const [oldT, newT] of replacements) {
            if (oldT !== newT) {
                content = content.split(oldT).join(newT);
            }
        }
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Replaced tokens in ${file}`);
    }
}
