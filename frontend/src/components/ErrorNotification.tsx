import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

interface ErrorNotificationProps {
  message: string | null;
  type?: 'error' | 'success' | 'info';
  onDismiss?: () => void;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({ message, type = 'error', onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [message, onDismiss]);

  const colors = {
    error: 'bg-error-container text-error border-error/20',
    success: 'bg-emerald-500/10 text-on-tertiary-container border-on-tertiary-container/20',
    info: 'bg-secondary-container text-surface-tint border-surface-tint/20',
  };

  const icons = {
    error: 'error',
    success: 'check_circle',
    info: 'info',
  };

  return (
    <AnimatePresence>
      {visible && message && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 z-50 sm:max-w-sm p-3 sm:p-4 rounded-xl border shadow-lg backdrop-blur-sm ${colors[type]}`}
        >
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-lg mt-0.5">{icons[type]}</span>
            <div className="flex-1">
              <p className="text-xs font-bold">{message}</p>
            </div>
            <button
              onClick={() => {
                setVisible(false);
                onDismiss?.();
              }}
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Hook to manage notification queue
export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((message: string, type: Notification['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setNotifications((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notifications, notify, dismiss };
}

export default ErrorNotification;
