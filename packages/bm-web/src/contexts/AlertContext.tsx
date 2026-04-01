import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import { AlertContext, type AlertOptions } from './alert';
import Alert from '@/components/Alert';
import type { AlertVariant } from '@/components/Alert/types';

type AlertState = {
  id: string;
  message: string;
  variant: AlertVariant;
  duration: number;
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alerts, setAlerts] = useState<AlertState[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const alert = useCallback((message: string, options?: AlertOptions) => {
    const id = `alert-${Date.now()}-${Math.random()}`;
    const variant = options?.variant || 'info';
    const duration = options?.duration ?? 3000; // Default 3 seconds

    setAlerts((prev) => [...prev, { id, message, variant, duration }]);
  }, []);

  const removeAlert = useCallback((id: string) => {
    // Clear timer if it exists
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  // Auto-dismiss alerts after their duration
  useEffect(() => {
    const timers = timersRef.current;
    const alertIds = new Set(alerts.map((alert) => alert.id));

    // Clean up timers for alerts that no longer exist
    timers.forEach((timer, id) => {
      if (!alertIds.has(id)) {
        clearTimeout(timer);
        timers.delete(id);
      }
    });

    // Set up timers for new alerts
    alerts.forEach((alertState) => {
      // Skip if timer already exists for this alert
      if (timers.has(alertState.id)) {
        return;
      }

      if (alertState.duration > 0) {
        const timer = setTimeout(() => {
          removeAlert(alertState.id);
        }, alertState.duration);
        timers.set(alertState.id, timer);
      }
    });

    // Cleanup function to clear all timers on unmount
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [alerts, removeAlert]);

  return (
    <AlertContext.Provider value={{ alert }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, pointerEvents: 'none' as const }}>
            {alerts.map((alertState, index) => (
              <div
                key={alertState.id}
                css={css`
                  position: fixed;
                  top: ${120 + index * 80}px;
                  left: 50%;
                  transform: translateX(-50%);
                  pointer-events: auto;
                `}
              >
                <Alert variant={alertState.variant}>{alertState.message}</Alert>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </AlertContext.Provider>
  );
};
