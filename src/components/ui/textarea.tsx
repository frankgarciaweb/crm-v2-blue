import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, style, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn('flex min-h-[80px] w-full px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50', className)}
        style={{
          backgroundColor: '#131b2e',
          border: '1px solid #434655',
          borderRadius: '0.125rem',
          color: '#dae2fd',
          fontFamily: 'Inter, sans-serif',
          outline: 'none',
          resize: 'vertical',
          ...style,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#b4c5ff'; }}
        onBlur={e => { e.currentTarget.style.borderColor = '#434655'; }}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };

