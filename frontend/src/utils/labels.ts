/** Map internal report_type keys to user-facing Spanish labels */
const REPORT_TYPE_LABELS: Record<string, string> = {
  engagement_analytics: 'Analítica de Engagement',
  revenue_breakdown: 'Desglose de Ingresos',
  growth_summary: 'Resumen de Crecimiento',
};

export function reportTypeLabel(key: string): string {
  return REPORT_TYPE_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const REPORT_TYPES = Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));
