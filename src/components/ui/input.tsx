import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, style, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn('flex h-9 w-full px-3 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50', className)}
        style={{
          backgroundColor: '#131b2e',
          border: '1px solid #434655',
          borderRadius: '0.125rem',
          color: '#dae2fd',
          fontFamily: 'Inter, sans-serif',
          outline: 'none',
          ...style,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#b4c5ff'; }}
        onBlur={e => { e.currentTarget.style.borderColor = '#434655'; }}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
