import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Layers, CalendarRange, FileText, FileSpreadsheet, Braces, Send, Loader2, Info } from 'lucide-react';
import type { CreateJobRequest } from '../types';
import { REPORT_TYPES } from '../utils/labels';

interface JobFormProps {
  onSubmit: (data: CreateJobRequest) => Promise<void>;
  loading?: boolean;
}

const FORMATS = ['pdf', 'csv', 'json'] as const;

const FORMAT_ICON_MAP: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-[18px] h-[18px]" />,
  csv: <FileSpreadsheet className="w-[18px] h-[18px]" />,
  json: <Braces className="w-[18px] h-[18px]" />,
};

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
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="lg:col-span-4 p-4 sm:p-6 lg:p-10 border-b lg:border-b-0 lg:border-r border-outline-variant/10 bg-surface-container-lowest"
    >
      <div className="mb-5 sm:mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-surface-tint/10 flex items-center justify-center">
            <BarChart3 className="w-[18px] h-[18px] text-surface-tint" />
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-primary">Solicitar Reporte</h2>
        </div>
        <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed pl-[42px]">
          Configura los parámetros para generar un análisis personalizado.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-7">
        {/* Report Type */}
        <div className="space-y-2.5">
          <label className="text-[10px] font-black tracking-[0.1em] text-on-surface-variant uppercase flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Tipo de Reporte
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full bg-surface-container-low border border-transparent rounded-xl py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-surface-tint/30 focus:border-surface-tint transition-all duration-200 outline-none appearance-none cursor-pointer"
          >
            {REPORT_TYPES.map((rt) => (
              <option key={rt.value} value={rt.value}>{rt.label}</option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="space-y-2.5">
          <label className="text-[10px] font-black tracking-[0.1em] text-on-surface-variant uppercase flex items-center gap-1.5">
            <CalendarRange className="w-3.5 h-3.5" />
            Rango de Fechas
          </label>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="min-w-0">
              <span className="block text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-wider mb-1">Desde</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-surface-container-low border border-transparent rounded-xl py-3 sm:py-3.5 px-2.5 sm:px-4 text-sm font-medium focus:ring-2 focus:ring-surface-tint/30 focus:border-surface-tint transition-all duration-200 outline-none"
              />
            </div>
            <div className="min-w-0">
              <span className="block text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-wider mb-1">Hasta</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-surface-container-low border border-transparent rounded-xl py-3 sm:py-3.5 px-2.5 sm:px-4 text-sm font-medium focus:ring-2 focus:ring-surface-tint/30 focus:border-surface-tint transition-all duration-200 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Format */}
        <div className="space-y-2.5">
          <label className="text-[10px] font-black tracking-[0.1em] text-on-surface-variant uppercase flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Formato
          </label>
          <div className="grid grid-cols-3 gap-3">
            {FORMATS.map((fmt) => (
              <label key={fmt} className="cursor-pointer group">
                <input
                  type="radio"
                  name="format"
                  value={fmt}
                  checked={format === fmt}
                  onChange={() => setFormat(fmt)}
                  className="hidden peer"
                />
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="py-3 flex flex-col items-center gap-1 rounded-xl bg-surface-container-low text-on-surface-variant peer-checked:bg-gradient-to-br peer-checked:from-primary peer-checked:to-primary-container peer-checked:text-white peer-checked:shadow-lg transition-all duration-200"
                >
                  {FORMAT_ICON_MAP[fmt]}
                  <span className="text-[10px] font-bold uppercase tracking-widest">{fmt.toUpperCase()}</span>
                </motion.div>
              </label>
            ))}
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-4 bg-gradient-to-br from-primary to-primary-container text-white py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-shadow duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-flex"
              >
                <Loader2 className="w-4 h-4" />
              </motion.span>
              Enviando...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Send className="w-4 h-4" />
              Generar Reporte
            </span>
          )}
        </motion.button>
      </form>

      {/* Queue Status Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6 sm:mt-10 p-4 sm:p-5 rounded-xl bg-surface-tint/[0.04] border border-surface-tint/10"
      >
        <div className="flex items-start gap-3">
          <Info className="w-[18px] h-[18px] text-surface-tint mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] font-black text-on-surface uppercase tracking-wider mb-1">Estado de la Cola</p>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Los reportes se procesan de forma asíncrona. El estado se actualiza en tiempo real vía WebSocket.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default JobForm;
