import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45',
  {
    variants: {
      tone: {
        brand: 'border-[#cb3f2f] bg-[#dd4b39] text-white hover:bg-[#c63a2a]',
        neutral: 'border-[#dacfb8] bg-[#fff8ec] text-[#3a3d3a] hover:bg-[#f6ecd8]',
        ghost: 'border-transparent bg-transparent text-[#444944] hover:border-[#d9ceb5] hover:bg-[#f8f0dd]',
        danger: 'border-[#cf7670] bg-[#ffece8] text-[#9d2f28] hover:bg-[#ffd8d2]'
      },
      size: {
        md: 'h-10',
        sm: 'h-8 rounded-lg px-3 text-xs'
      }
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'md'
    }
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, tone, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ tone, size }), className)} {...props} />;
}
