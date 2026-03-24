import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Job } from '../types';
import JobStatusBadge from './JobStatusBadge';
import { jobsApi } from '../services/api';
import { reportTypeLabel } from '../utils/labels';

interface JobListProps {
  jobs: Job[];
  total: number;
  page: number;
  hasNext: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
}

const formatTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoString;
  }
};

const FORMAT_ICONS: Record<string, string> = {
  pdf: 'picture_as_pdf',
  csv: 'table_chart',
  json: 'data_object',
};

const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  }),
};

const JobList: React.FC<JobListProps> = ({ jobs, total, page, hasNext, onNextPage, onPrevPage }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className="lg:col-span-7 p-8 lg:p-10 bg-surface"
    >
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-on-tertiary-container/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-on-tertiary-container text-[18px]">monitoring</span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-primary">Trabajos Recientes</h2>
          </div>
          <p className="text-xs text-on-surface-variant pl-[42px]">Monitoreo en vivo de solicitudes</p>
        </div>
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-2 text-[10px] font-bold text-on-tertiary-container bg-emerald-500/10 px-3 py-1.5 rounded-full"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container" />
          <span className="uppercase tracking-widest">En Vivo</span>
        </motion.div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {jobs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 text-on-surface-variant"
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-container-low mx-auto mb-4 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl opacity-40">assignment</span>
            </div>
            <p className="text-sm font-bold text-on-surface">Aún no hay reportes</p>
            <p className="text-xs mt-1 text-on-surface-variant">Envía una solicitud de reporte para comenzar</p>
          </motion.div>
        ) : (
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.15em]">
                <th className="pb-3 px-4">ID</th>
                <th className="pb-3 px-4">Tipo de Reporte</th>
                <th className="pb-3 px-4">Creado</th>
                <th className="pb-3 px-4 text-center">Estado</th>
                <th className="pb-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {jobs.map((job, i) => (
                  <motion.tr
                    key={job.job_id}
                    custom={i}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, x: -20 }}
                    layout
                    className="bg-surface-container-lowest group hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow duration-200"
                  >
                    <td className="py-4 px-4 rounded-l-xl">
                      <span className="text-xs font-mono font-bold text-on-surface/80">#{job.job_id.slice(0, 8)}</span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-xs font-bold text-on-surface">{reportTypeLabel(job.report_type)}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[12px] text-on-surface-variant/50">
                          {FORMAT_ICONS[job.parameters.format || 'json'] || 'description'}
                        </span>
                        <span className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider font-medium">
                          {(job.parameters.format || 'json').toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs font-medium text-on-surface-variant">
                      {formatTime(job.created_at)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <JobStatusBadge status={job.status} />
                    </td>
                    <td className="py-4 px-4 rounded-r-xl text-right">
                      <JobAction job={job} />
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex justify-between items-center text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest"
        >
          <span>Mostrando {jobs.length} de {total} trabajos</span>
          <div className="flex gap-1">
            <button
              onClick={onPrevPage}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg hover:bg-surface-container-low transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={onNextPage}
              disabled={!hasNext}
              className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-on-surface"
            >
              Siguiente
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const JobAction: React.FC<{ job: Job }> = ({ job }) => {
  const [showDetails, setShowDetails] = useState(false);

  switch (job.status) {
    case 'COMPLETED':
      return (
        <motion.a
          href={jobsApi.downloadUrl(job.job_id)}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-1.5 text-[10px] font-black text-surface-tint uppercase tracking-widest bg-surface-tint/[0.06] px-3 py-1.5 rounded-lg hover:bg-surface-tint/[0.12] transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">download</span>
          Descargar
        </motion.a>
      );
    case 'PROCESSING':
      return (
        <div className="relative">
          <motion.button
            onClick={() => setShowDetails(!showDetails)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-1.5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest bg-surface-container-low px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">terminal</span>
            Ver Log
          </motion.button>
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 z-10 bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 shadow-xl w-64"
              >
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Procesando...</p>
                <div className="space-y-1.5 text-[10px] text-on-surface-variant/70">
                  <p>ID: <span className="font-mono text-on-surface">{job.job_id.slice(0, 16)}</span></p>
                  <p>Tipo: <span className="text-on-surface">{reportTypeLabel(job.report_type)}</span></p>
                  <p>Iniciado: <span className="text-on-surface">{new Date(job.updated_at).toLocaleTimeString()}</span></p>
                </div>
                <div className="mt-3 w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-surface-tint rounded-full"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ width: '50%' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-600/80 uppercase tracking-widest">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          En Cola
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-error uppercase tracking-widest">
          <span className="material-symbols-outlined text-[14px]">error_outline</span>
          Ver Error
        </span>
      );
    default:
      return null;
  }
};

export default JobList;
