import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:     'bg-[#2563eb] text-[#eeefff] hover:opacity-90 shadow-sm',
        destructive: 'bg-[#93000a] text-[#ffdad6] hover:opacity-90 shadow-sm',
        outline:     'border border-[rgba(255,255,255,0.08)] bg-transparent text-[#c3c6d7] hover:bg-[#222a3d] hover:text-[#dae2fd]',
        ghost:       'text-[#c3c6d7] hover:bg-[#222a3d] hover:text-[#dae2fd]',
        secondary:   'bg-[#222a3d] text-[#dae2fd] hover:bg-[#2d3449]',
        link:        'text-[#b4c5ff] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 rounded-[0.125rem]',
        sm:      'h-8 px-3 text-xs rounded-[0.125rem]',
        lg:      'h-10 px-8 rounded-[0.25rem]',
        icon:    'h-9 w-9 rounded-[0.125rem]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
