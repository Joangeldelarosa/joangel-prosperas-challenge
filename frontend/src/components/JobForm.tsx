import React, { useState } from 'react';
import type { CreateJobRequest } from '../types';

interface JobFormProps {
  onSubmit: (data: CreateJobRequest) => Promise<void>;
  loading?: boolean;
}

const REPORT_TYPES = [
  { value: 'engagement_analytics', label: 'Analítica de Engagement' },
  { value: 'revenue_breakdown', label: 'Desglose de Ingresos' },
  { value: 'growth_summary', label: 'Resumen de Crecimiento' },
];

const FORMATS = ['pdf', 'csv', 'json'] as const;

const JobForm: React.FC<JobFormProps> = ({ onSubmit, loading }) => {
  const [reportType, setReportType] = useState(REPORT_TYPES[0]!.value);
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-12-31');
  const [format, setFormat] = useState<string>('pdf');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      report_type: reportType,
      date_range: { start: startDate, end: endDate },
      format,
    });
  };

  return (
    <div className="lg:col-span-5 p-10 border-r border-outline-variant/10 bg-surface-container-lowest">
      <div className="mb-10">
        <h2 className="text-2xl font-black tracking-tight text-primary mb-2">Solicitar Reporte</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          Configura los parámetros para generar un análisis personalizado. Los procesos se manejan de forma asíncrona.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Report Type */}
        <div className="space-y-2">
          <label className="text-[10px] font-black tracking-[0.1em] text-on-surface-variant uppercase">
            Tipo de Reporte
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-lg py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary transition-all outline-none"
          >
            {REPORT_TYPES.map((rt) => (
              <option key={rt.value} value={rt.value}>{rt.label}</option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <label className="text-[10px] font-black tracking-[0.1em] text-on-surface-variant uppercase">
            Rango de Fechas
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-surface-container-low border-none rounded-lg py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary transition-all outline-none"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-surface-container-low border-none rounded-lg py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary transition-all outline-none"
            />
          </div>
        </div>

        {/* Format */}
        <div className="space-y-2">
          <label className="text-[10px] font-black tracking-[0.1em] text-on-surface-variant uppercase">
            Formato
          </label>
          <div className="grid grid-cols-3 gap-3">
            {FORMATS.map((fmt) => (
              <label key={fmt} className="cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value={fmt}
                  checked={format === fmt}
                  onChange={() => setFormat(fmt)}
                  className="hidden peer"
                />
                <div className="py-3 text-center rounded-lg bg-surface-container-low text-xs font-bold peer-checked:bg-primary peer-checked:text-white transition-all uppercase tracking-widest">
                  {fmt.toUpperCase()}
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-8 bg-gradient-to-br from-primary to-primary-container text-white py-4 rounded-lg font-bold text-xs uppercase tracking-[0.2em] shadow-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Generar Reporte'}
        </button>
      </form>

      {/* Queue Status Info */}
      <div className="mt-12 p-6 rounded-xl bg-surface-container">
        <div className="flex items-start space-x-3">
          <span className="material-symbols-outlined text-surface-tint mt-0.5">info</span>
          <div>
            <p className="text-[11px] font-bold text-on-surface uppercase tracking-wider mb-1">Estado de la Cola</p>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              El tiempo estimado de procesamiento para conjuntos de datos grandes es de 4-6 minutos. Recibirás una notificación al completarse.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobForm;
