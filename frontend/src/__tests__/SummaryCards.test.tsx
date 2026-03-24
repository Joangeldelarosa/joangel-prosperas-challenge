import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SummaryCards from '../components/SummaryCards'
import type { Job } from '../types'

const mockJob = (status: Job['status']): Job => ({
  job_id: `job-${status.toLowerCase()}`,
  user_id: 'user-1',
  status,
  report_type: 'engagement_analytics',
  parameters: { format: 'pdf' },
  created_at: '2025-06-15T10:30:00Z',
  updated_at: '2025-06-15T10:35:00Z',
  result_url: null,
})

describe('SummaryCards', () => {
  it('renders all three summary cards', () => {
    render(<SummaryCards jobs={[]} total={0} />)
    expect(screen.getByText('Total de Reportes')).toBeInTheDocument()
    expect(screen.getByText('Tasa de Éxito')).toBeInTheDocument()
    expect(screen.getByText('En Cola Ahora')).toBeInTheDocument()
  })

  it('displays total count from props', () => {
    render(<SummaryCards jobs={[]} total={42} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('shows dash for success rate when no jobs finished', () => {
    render(<SummaryCards jobs={[]} total={0} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows success rate when there are completed jobs', () => {
    const jobs = [mockJob('COMPLETED'), mockJob('FAILED')]
    render(<SummaryCards jobs={jobs} total={2} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('displays completed count badge', () => {
    const jobs = [mockJob('COMPLETED'), mockJob('COMPLETED'), mockJob('PENDING')]
    render(<SummaryCards jobs={jobs} total={3} />)
    expect(screen.getByText('+2 listos')).toBeInTheDocument()
  })
})
