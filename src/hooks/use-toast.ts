import { useCallback, useState } from 'react';

export type ToastInput = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

type ToastState = ToastInput & {
  id: number;
};

const listeners = new Set<(toast: ToastState) => void>();
let nextToastId = 1;

export function toast(input: ToastInput) {
  const payload: ToastState = {
    id: nextToastId++,
    ...input,
  };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm-toast', { detail: payload }));
  }

  for (const listener of listeners) {
    listener(payload);
  }

  return payload;
}

export function useToast() {
  const [lastToast, setLastToast] = useState<ToastState | null>(null);

  const pushToast = useCallback((input: ToastInput) => toast(input), []);

  return {
    toast: pushToast,
    lastToast,
    dismiss: () => setLastToast(null),
  };
}

