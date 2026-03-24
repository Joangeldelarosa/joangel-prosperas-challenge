/** Map internal report_type keys to user-facing Spanish labels */
const REPORT_TYPE_LABELS: Record<string, string> = {
  engagement_analytics: 'Analítica de Engagement',
  revenue_breakdown: 'Desglose de Ingresos',
  growth_summary: 'Resumen de Crecimiento',
  failing_report: 'Reporte de Prueba (Fallo)',
};

export function reportTypeLabel(key: string): string {
  return REPORT_TYPE_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Types routed to the high-priority SQS queue (must match backend HIGH_PRIORITY_TYPES). */
const HIGH_PRIORITY_TYPES = new Set(['revenue_breakdown']);

export function isHighPriority(reportType: string): boolean {
  return HIGH_PRIORITY_TYPES.has(reportType);
}

export function priorityLabel(reportType: string): string {
  return HIGH_PRIORITY_TYPES.has(reportType) ? 'Alta' : 'Estándar';
}

export const REPORT_TYPES = Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));
