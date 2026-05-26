import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-[#2563eb]/20 text-[#b4c5ff]',
        ready:       'bg-[#10B981]/15 text-[#10B981]',
        production:  'bg-[#3B82F6]/15 text-[#3B82F6]',
        pending:     'bg-[#64748B]/15 text-[#64748B]',
        alert:       'bg-[#EF4444]/15 text-[#EF4444]',
        secondary:   'bg-[#ee9800]/15 text-[#ffb95f]',
        outline:     'border border-[rgba(255,255,255,0.08)] text-[#c3c6d7]',
        // compatibility aliases
        success:     'bg-[#10B981]/15 text-[#10B981]',
        warning:     'bg-[#ee9800]/15 text-[#ffb95f]',
        destructive: 'bg-[#EF4444]/15 text-[#EF4444]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={{ borderRadius: '0.125rem', fontFamily: 'JetBrains Mono, monospace' }}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
