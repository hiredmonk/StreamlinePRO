import { STATUS_BADGE_TONE } from '@/lib/constants/status-colors';
import { cn } from '@/lib/utils';

export function StatusBadge({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        STATUS_BADGE_TONE[name] ?? 'border-slate-200 bg-slate-100 text-slate-700',
        className
      )}
    >
      {name}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: 'low' | 'medium' | 'high' | null }) {
  if (!priority) {
    return <span className="text-xs text-[#777167]">No priority</span>;
  }

  const className =
    priority === 'high'
      ? 'border-[#d26d62] bg-[#ffece8] text-[#9f2f24]'
      : priority === 'medium'
        ? 'border-[#d9a863] bg-[#fff7e8] text-[#9d5b00]'
        : 'border-[#86a68d] bg-[#edf7ef] text-[#1f6e3d]';

  return (
    <span className={cn('inline-flex rounded-full border px-2 py-1 text-xs font-semibold capitalize', className)}>
      {priority}
    </span>
  );
}
