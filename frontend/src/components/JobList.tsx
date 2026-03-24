import React, { useState } from 'react';
import type { Job } from '../types';
import JobStatusBadge from './JobStatusBadge';
import { jobsApi } from '../services/api';

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

const formatReportType = (type: string): string => {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const JobList: React.FC<JobListProps> = ({ jobs, total, page, hasNext, onNextPage, onPrevPage }) => {
  return (
    <div className="lg:col-span-7 p-10 bg-surface">
      {/* Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-xl font-black tracking-tight text-primary">Trabajos Recientes</h2>
          <p className="text-xs text-on-surface-variant mt-1">Monitoreo en vivo de solicitudes de procesamiento</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-bold text-on-tertiary-container bg-emerald-500/10 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container animate-pulse" />
          <span className="uppercase tracking-widest">En Vivo</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {jobs.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-4 block opacity-30">assignment</span>
            <p className="text-sm font-medium">Aún no hay reportes</p>
            <p className="text-xs mt-1">Envía una solicitud de reporte para comenzar</p>
          </div>
        ) : (
          <table className="w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                <th className="pb-2 px-4">ID</th>
                <th className="pb-2 px-4">Tipo de Reporte</th>
                <th className="pb-2 px-4">Creado</th>
                <th className="pb-2 px-4 text-center">Estado</th>
                <th className="pb-2 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.job_id} className="bg-surface-container-lowest group hover:shadow-md transition-shadow">
                  <td className="py-5 px-4 rounded-l-xl text-xs font-mono font-bold text-slate-900">
                    #{job.job_id.slice(0, 8)}
                  </td>
                  <td className="py-5 px-4">
                    <p className="text-xs font-bold text-slate-900">{formatReportType(job.report_type)}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-tighter">
                      Formato {(job.parameters.format || 'json').toUpperCase()}
                    </p>
                  </td>
                  <td className="py-5 px-4 text-xs font-medium text-slate-500">
                    {formatTime(job.created_at)}
                  </td>
                  <td className="py-5 px-4 text-center">
                    <JobStatusBadge status={job.status} />
                  </td>
                  <td className="py-5 px-4 rounded-r-xl text-right">
                    <JobAction job={job} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="mt-8 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>Mostrando {jobs.length} de {total} trabajos</span>
          <div className="flex space-x-4">
            <button
              onClick={onPrevPage}
              disabled={page <= 1}
              className="hover:text-black transition-colors disabled:opacity-30"
            >
              Anterior
            </button>
            <button
              onClick={onNextPage}
              disabled={!hasNext}
              className="hover:text-black text-black transition-colors disabled:opacity-30 disabled:text-slate-400"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const JobAction: React.FC<{ job: Job }> = ({ job }) => {
  const [showDetails, setShowDetails] = useState(false);

  switch (job.status) {
    case 'COMPLETED':
      return (
        <a
          href={jobsApi.downloadUrl(job.job_id)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-black text-surface-tint uppercase tracking-widest hover:underline flex items-center justify-end ml-auto space-x-1"
        >
          <span>Descargar</span>
          <span className="material-symbols-outlined text-sm">download</span>
        </a>
      );
    case 'PROCESSING':
      return (
        <div className="relative">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-end ml-auto space-x-1 hover:text-surface-tint transition-colors"
          >
            <span>Ver Log</span>
            <span className="material-symbols-outlined text-sm">terminal</span>
          </button>
          {showDetails && (
            <div className="absolute right-0 top-8 z-10 bg-surface-container-lowest border border-outline-variant/20 rounded-lg p-4 shadow-lg w-64">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Procesando...</p>
              <div className="space-y-1 text-[10px] text-slate-500">
                <p>ID: <span className="font-mono">{job.job_id.slice(0, 16)}</span></p>
                <p>Tipo: {job.report_type.replace(/_/g, ' ')}</p>
                <p>Iniciado: {new Date(job.updated_at).toLocaleTimeString()}</p>
              </div>
              <div className="mt-3 w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-surface-tint rounded-full animate-pulse" style={{ width: '65%' }} />
              </div>
            </div>
          )}
        </div>
      );
    case 'PENDING':
      return (
        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center justify-end ml-auto space-x-1">
          <span>En Cola</span>
          <span className="material-symbols-outlined text-sm">schedule</span>
        </span>
      );
    case 'FAILED':
      return (
        <span className="text-[10px] font-black text-error uppercase tracking-widest flex items-center justify-end ml-auto space-x-1">
          <span>Ver Error</span>
          <span className="material-symbols-outlined text-sm">error_outline</span>
        </span>
      );
    default:
      return null;
  }
};

export default JobList;
