import React from 'react';
import type { Job } from '../types';

interface SummaryCardsProps {
  jobs: Job[];
  total: number;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ jobs, total }) => {
  const completedCount = jobs.filter((j) => j.status === 'COMPLETED').length;
  const processingJobs = jobs.filter((j) => j.status === 'PROCESSING' || j.status === 'COMPLETED');

  // Calculate average simulated processing time
  const avgProcessing = processingJobs.length > 0 ? '4.2m' : '—';

  return (
    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Total Reports */}
      <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0px_4px_12px_rgba(25,28,30,0.02)] border border-outline-variant/10">
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center">
            <span className="material-symbols-outlined text-surface-tint">trending_up</span>
          </div>
          <span className="text-[10px] font-bold text-on-tertiary-container bg-emerald-500/10 px-2 py-1 rounded">+{completedCount}</span>
        </div>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Reportes</h3>
        <p className="text-3xl font-black text-black tracking-tight">{total}</p>
      </div>

      {/* Avg Processing */}
      <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0px_4px_12px_rgba(25,28,30,0.02)] border border-outline-variant/10">
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center">
            <span className="material-symbols-outlined text-surface-tint">speed</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">Normal</span>
        </div>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tiempo Promedio</h3>
        <p className="text-3xl font-black text-black tracking-tight">{avgProcessing}</p>
      </div>

      {/* Data Consumed */}
      <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0px_4px_12px_rgba(25,28,30,0.02)] border border-outline-variant/10">
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center">
            <span className="material-symbols-outlined text-surface-tint">storage</span>
          </div>
          <span className="text-[10px] font-bold text-on-tertiary-container bg-emerald-500/10 px-2 py-1 rounded">Optimizado</span>
        </div>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Datos Consumidos</h3>
        <p className="text-3xl font-black text-black tracking-tight">8.4GB</p>
      </div>
    </div>
  );
};

export default SummaryCards;
