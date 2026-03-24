import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, CheckCircle, ListOrdered } from 'lucide-react';
import type { Job } from '../types';

interface SummaryCardsProps {
  jobs: Job[];
  total: number;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.4 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const SummaryCards: React.FC<SummaryCardsProps> = ({ jobs, total }) => {
  const completedCount = jobs.filter((j) => j.status === 'COMPLETED').length;
  const processingCount = jobs.filter((j) => j.status === 'PROCESSING').length;
  const failedCount = jobs.filter((j) => j.status === 'FAILED').length;
  const pendingCount = jobs.filter((j) => j.status === 'PENDING').length;

  // Compute real success rate
  const finishedCount = completedCount + failedCount;
  const successRate = finishedCount > 0 ? Math.round((completedCount / finishedCount) * 100) : 0;
  const successLabel = finishedCount > 0 ? `${successRate}%` : '—';

  // Queue activity: processing + pending
  const queueActive = processingCount + pendingCount;

  const cards = [
    {
      Icon: TrendingUp,
      label: 'Total de Reportes',
      value: total,
      badge: completedCount > 0 ? `+${completedCount} listos` : 'Sin datos',
      badgeColor: completedCount > 0
        ? 'text-on-tertiary-container bg-emerald-500/10'
        : 'text-on-surface-variant/60 bg-surface-container-low',
    },
    {
      Icon: CheckCircle,
      label: 'Tasa de Éxito',
      value: successLabel,
      badge: finishedCount > 0 ? `${finishedCount} finalizados` : 'Sin datos',
      badgeColor: successRate >= 80
        ? 'text-on-tertiary-container bg-emerald-500/10'
        : successRate >= 50
          ? 'text-amber-600 bg-amber-500/10'
          : finishedCount > 0
            ? 'text-error bg-error-container'
            : 'text-on-surface-variant/60 bg-surface-container-low',
    },
    {
      Icon: ListOrdered,
      label: 'En Cola Ahora',
      value: queueActive,
      badge: processingCount > 0 ? `${processingCount} procesando` : 'Cola vacía',
      badgeColor: processingCount > 0
        ? 'text-surface-tint bg-secondary-container'
        : 'text-on-surface-variant/60 bg-surface-container-low',
    },
  ];

  return (
    <div className="mt-4 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          custom={i}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="bg-surface-container-lowest p-4 sm:p-7 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/10 transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
        >
          <div className="flex justify-between items-start mb-3 sm:mb-5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-surface-container-low flex items-center justify-center">
              <card.Icon className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-surface-tint" />
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${card.badgeColor}`}>
              {card.badge}
            </span>
          </div>
          <h3 className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-1">{card.label}</h3>
          <p className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">{card.value}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default SummaryCards;
