import React from 'react';
import type { Job } from '../types';

interface JobStatusBadgeProps {
  status: Job['status'];
}

const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({ status }) => {
  const config = {
    COMPLETED: {
      bg: 'bg-emerald-500/10',
      text: 'text-on-tertiary-container',
      label: 'Completado',
    },
    PROCESSING: {
      bg: 'bg-secondary-container',
      text: 'text-surface-tint',
      label: 'Procesando',
    },
    PENDING: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-600',
      label: 'Pendiente',
    },
    FAILED: {
      bg: 'bg-error-container',
      text: 'text-error',
      label: 'Fallido',
    },
  };

  const { bg, text, label } = config[status] || config.PENDING;

  return (
    <div className="flex flex-col items-center space-y-2">
      <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${bg} ${text}`}>
        {label}
      </span>
      {status === 'PROCESSING' && (
        <div className="w-24 h-1 bg-surface-container-high rounded-full overflow-hidden">
          <div className="h-full bg-surface-tint rounded-full animate-pulse" style={{ width: '65%' }} />
        </div>
      )}
    </div>
  );
};

export default JobStatusBadge;
