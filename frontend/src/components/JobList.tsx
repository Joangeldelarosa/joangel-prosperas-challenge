import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Job } from '../types';
import JobStatusBadge from './JobStatusBadge';
import { jobsApi } from '../services/api';
import { reportTypeLabel, priorityLabel, isHighPriority } from '../utils/labels';

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
    transition: { delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const JobList: React.FC<JobListProps> = ({ jobs, total, page, hasNext, onNextPage, onPrevPage }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className="lg:col-span-7 p-4 sm:p-6 lg:p-8 bg-surface min-w-0"
    >
      {/* Header */}
      <div className="flex justify-between items-center sm:items-end mb-4 sm:mb-8">
        <div>
          <div className="flex items-center gap-2 sm:gap-2.5 mb-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-on-tertiary-container/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-on-tertiary-container text-[16px] sm:text-[18px]">monitoring</span>
            </div>
            <h2 className="text-base sm:text-xl font-black tracking-tight text-primary">Trabajos Recientes</h2>
          </div>
          <p className="text-[10px] sm:text-xs text-on-surface-variant pl-9 sm:pl-[42px]">Monitoreo en vivo</p>
        </div>
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold text-on-tertiary-container bg-emerald-500/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container" />
          <span className="uppercase tracking-widest">En Vivo</span>
        </motion.div>
      </div>

      {/* Empty State */}
      {jobs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 sm:py-20 text-on-surface-variant"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-surface-container-low mx-auto mb-3 sm:mb-4 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl sm:text-3xl opacity-40">assignment</span>
          </div>
          <p className="text-sm font-bold text-on-surface">Aún no hay reportes</p>
          <p className="text-xs mt-1 text-on-surface-variant">Envía una solicitud de reporte para comenzar</p>
        </motion.div>
      ) : (
        <>
          {/* ── Mobile Card View ── */}
          <div className="space-y-3 md:hidden">
            <AnimatePresence mode="popLayout">
              {jobs.map((job, i) => (
                <motion.div
                  key={job.job_id}
                  custom={i}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, x: -20 }}
                  layout
                  className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
                >
                  {/* Card header: status + ID */}
                  <div className="flex items-center justify-between mb-3">
                    <JobStatusBadge status={job.status} />
                    <span className="text-[10px] font-mono font-bold text-on-surface/40">#{job.job_id.slice(0, 8)}</span>
                  </div>

                  {/* Card body: type, format, time */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-on-surface">{reportTypeLabel(job.report_type)}</p>
                      {isHighPriority(job.report_type) && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
                          ⚡ Alta
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="material-symbols-outlined text-[12px] text-on-surface-variant/50">
                        {FORMAT_ICONS[job.parameters.format || 'json'] || 'description'}
                      </span>
                      <span className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider font-medium">
                        {(job.parameters.format || 'json').toUpperCase()}
                      </span>
                      <span className="text-on-surface-variant/30">·</span>
                      <span className="text-[10px] text-on-surface-variant/60 font-medium">
                        {formatTime(job.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Card footer: action */}
                  <div className="pt-3 border-t border-outline-variant/10 flex justify-end">
                    <JobAction job={job} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* ── Desktop Table View ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left table-fixed border-separate" style={{ borderSpacing: '0 8px' }}>
              <thead>
                <tr className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.15em]">
                  <th className="pb-3 pl-4 pr-2 w-[15%]">ID</th>
                  <th className="pb-3 px-2 w-[30%]">Tipo de Reporte</th>
                  <th className="pb-3 px-2 w-[13%]">Creado</th>
                  <th className="pb-3 px-2 w-[22%] text-center">Estado</th>
                  <th className="pb-3 pl-2 pr-4 w-[20%] text-right">Acciones</th>
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
                      <td className="py-3.5 pl-4 pr-2 rounded-l-xl">
                        <span className="text-xs font-mono font-bold text-on-surface/80">#{job.job_id.slice(0, 8)}</span>
                      </td>
                      <td className="py-3.5 px-2 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-on-surface truncate">{reportTypeLabel(job.report_type)}</p>
                          {isHighPriority(job.report_type) && (
                            <span className="shrink-0 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600">⚡</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[12px] text-on-surface-variant/50">
                            {FORMAT_ICONS[job.parameters.format || 'json'] || 'description'}
                          </span>
                          <span className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider font-medium">
                            {(job.parameters.format || 'json').toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-xs font-medium text-on-surface-variant whitespace-nowrap">
                        {formatTime(job.created_at)}
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <JobStatusBadge status={job.status} />
                      </td>
                      <td className="py-3.5 pl-2 pr-4 rounded-r-xl text-right">
                        <JobAction job={job} />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination */}
      {total > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest"
        >
          <span className="order-2 sm:order-1">Mostrando {jobs.length} de {total} trabajos</span>
          <div className="flex gap-1 order-1 sm:order-2 w-full sm:w-auto">
            <button
              onClick={onPrevPage}
              disabled={page <= 1}
              className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-lg hover:bg-surface-container-low transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={onNextPage}
              disabled={!hasNext}
              className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-on-surface"
            >
              Siguiente
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

/* ── Popover rendered via portal to escape overflow-hidden ancestors ── */
const Popover: React.FC<{
  show: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  width?: string;
  borderColor?: string;
  children: React.ReactNode;
}> = ({ show, onClose, anchorRef, width = 'w-72', borderColor = 'border-outline-variant/20', children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 6,
      left: rect.right,
    });
  }, [anchorRef]);

  useEffect(() => {
    if (!show) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [show, updatePosition]);

  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show, onClose, anchorRef]);

  if (!show || !pos) return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={`fixed z-50 ${width} max-w-[calc(100vw-2rem)] bg-surface-container-lowest border ${borderColor} rounded-xl p-4 shadow-xl`}
          style={{
            top: pos.top,
            right: Math.max(16, window.innerWidth - pos.left),
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

const JobAction: React.FC<{ job: Job }> = ({ job }) => {
  const [showDetails, setShowDetails] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  switch (job.status) {
    case 'COMPLETED':
      return (
        <motion.a
          href={jobsApi.downloadUrl(job.job_id)}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-1.5 text-[10px] font-black text-surface-tint uppercase tracking-widest bg-surface-tint/[0.06] px-3 py-2 sm:py-1.5 rounded-lg hover:bg-surface-tint/[0.12] transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">download</span>
          Descargar
        </motion.a>
      );
    case 'PROCESSING':
      return (
        <>
          <motion.button
            ref={btnRef}
            onClick={() => setShowDetails(!showDetails)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-1.5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest bg-surface-container-low px-3 py-2 sm:py-1.5 rounded-lg hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">terminal</span>
            Ver Log
          </motion.button>
          <Popover
            show={showDetails}
            onClose={() => setShowDetails(false)}
            anchorRef={btnRef}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Procesando...</p>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isHighPriority(job.report_type)
                  ? 'bg-amber-500/15 text-amber-600'
                  : 'bg-surface-container-high text-on-surface-variant/60'
              }`}>
                {isHighPriority(job.report_type) ? '⚡ Alta' : 'Estándar'}
              </span>
            </div>
            <div className="space-y-1.5 text-[10px] text-on-surface-variant/70">
              <p>ID: <span className="font-mono text-on-surface">{job.job_id.slice(0, 16)}</span></p>
              <p>Tipo: <span className="text-on-surface">{reportTypeLabel(job.report_type)}</span></p>
              <p>Cola: <span className="text-on-surface">Prioridad {priorityLabel(job.report_type)}</span></p>
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
          </Popover>
        </>
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
        <>
          <motion.button
            ref={btnRef}
            onClick={() => setShowDetails(!showDetails)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-1.5 text-[10px] font-black text-error uppercase tracking-widest bg-error/[0.06] px-3 py-2 sm:py-1.5 rounded-lg hover:bg-error/[0.12] transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">error_outline</span>
            Ver Error
          </motion.button>
          <Popover
            show={showDetails}
            onClose={() => setShowDetails(false)}
            anchorRef={btnRef}
            width="w-80"
            borderColor="border-error/20"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-error uppercase tracking-wider">Error de Procesamiento</p>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isHighPriority(job.report_type)
                  ? 'bg-amber-500/15 text-amber-600'
                  : 'bg-surface-container-high text-on-surface-variant/60'
              }`}>
                {isHighPriority(job.report_type) ? '⚡ Alta' : 'Estándar'}
              </span>
            </div>
            <div className="space-y-1.5 text-[10px] text-on-surface-variant/70">
              <p>ID: <span className="font-mono text-on-surface">{job.job_id.slice(0, 16)}</span></p>
              <p>Tipo: <span className="text-on-surface">{reportTypeLabel(job.report_type)}</span></p>
              <p>Cola: <span className="text-on-surface">Prioridad {priorityLabel(job.report_type)}</span></p>
              <p>Falló: <span className="text-on-surface">{new Date(job.updated_at).toLocaleTimeString()}</span></p>
            </div>
            <div className="mt-3 p-2.5 bg-error/[0.04] rounded-lg border border-error/10 space-y-2">
              {job.report_type === 'failing_report' ? (
                <>
                  <p className="text-[10px] font-bold text-error/90">Circuit Breaker activado</p>
                  <p className="text-[10px] text-error/70 leading-relaxed">
                    Este tipo de reporte falla deliberadamente para demostrar el patrón Circuit Breaker.
                    Tras 3 fallos consecutivos, el circuito se abre y bloquea nuevas ejecuciones de este
                    tipo durante 60 segundos. Después pasa a estado semi-abierto y permite un intento de prueba.
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="material-symbols-outlined text-[12px] text-error/60">info</span>
                    <span className="text-[9px] text-error/60">Los demás tipos de reporte no se ven afectados.</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-bold text-error/90">Reintentos agotados</p>
                  <p className="text-[10px] text-error/70 leading-relaxed">
                    El procesamiento falló tras agotar los reintentos con back-off exponencial
                    (10s → 20s → 40s). El mensaje fue movido a la Dead Letter Queue (DLQ)
                    para análisis posterior.
                  </p>
                </>
              )}
            </div>
          </Popover>
        </>
      );
    default:
      return null;
  }
};

export default JobList;
