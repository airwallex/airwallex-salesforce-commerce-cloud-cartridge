import { createContext } from 'react';
import type { AlertVariant } from '@/components/Alert/types';

export type AlertOptions = {
  variant?: AlertVariant;
  duration?: number; // Duration in milliseconds before auto-dismissing
};

export type AlertContextType = {
  alert: (message: string, options?: AlertOptions) => void;
};

export const AlertContext = createContext<AlertContextType | undefined>(undefined);
