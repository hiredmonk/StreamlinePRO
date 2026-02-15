import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass-panel p-8 text-center">
      <h3 className="text-2xl font-semibold text-[#222621]" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-[#5c605b]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
