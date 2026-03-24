import React from 'react';
import { motion } from 'framer-motion';
import type { Job } from '../types';

interface JobStatusBadgeProps {
  status: Job['status'];
}

const STATUS_CONFIG = {
  COMPLETED: {
    bg: 'bg-emerald-500/10',
    text: 'text-on-tertiary-container',
    label: 'Completado',
    icon: 'check_circle',
  },
  PROCESSING: {
    bg: 'bg-secondary-container',
    text: 'text-surface-tint',
    label: 'Procesando',
    icon: 'sync',
  },
  PENDING: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    label: 'Pendiente',
    icon: 'schedule',
  },
  FAILED: {
    bg: 'bg-error-container',
    text: 'text-error',
    label: 'Fallido',
    icon: 'error',
  },
};

const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${config.bg} ${config.text}`}
      >
        {status === 'PROCESSING' ? (
          <motion.span
            className="material-symbols-outlined text-[12px]"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          >
            {config.icon}
          </motion.span>
        ) : (
          <span className="material-symbols-outlined text-[12px]">{config.icon}</span>
        )}
        {config.label}
      </motion.span>
      {status === 'PROCESSING' && (
        <div className="w-20 h-1 bg-surface-container-high rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-surface-tint rounded-full"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '50%' }}
          />
        </div>
      )}
    </div>
  );
};

export default JobStatusBadge;
