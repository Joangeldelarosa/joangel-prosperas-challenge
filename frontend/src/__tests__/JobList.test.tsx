import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JobList from '../components/JobList'
import type { Job } from '../types'

const mockJob = (overrides: Partial<Job> = {}): Job => ({
  job_id: 'abc12345-6789-0000-0000-000000000000',
  user_id: 'user-1',
  status: 'COMPLETED',
  report_type: 'engagement_analytics',
  parameters: { date_range: { start: '2025-01-01', end: '2025-12-31' }, format: 'pdf' },
  created_at: '2025-06-15T10:30:00Z',
  updated_at: '2025-06-15T10:35:00Z',
  result_url: 'https://s3.example.com/report.pdf',
  ...overrides,
})

const defaultProps = {
  jobs: [] as Job[],
  total: 0,
  page: 1,
  hasNext: false,
  onNextPage: vi.fn(),
  onPrevPage: vi.fn(),
}

describe('JobList', () => {
  it('renders empty state when no jobs', () => {
    render(<JobList {...defaultProps} />)
    expect(screen.getByText('Aún no hay reportes')).toBeInTheDocument()
    expect(screen.getByText('Envía una solicitud de reporte para comenzar')).toBeInTheDocument()
  })

  it('renders header with live indicator', () => {
    render(<JobList {...defaultProps} />)
    expect(screen.getByText('Trabajos Recientes')).toBeInTheDocument()
    expect(screen.getByText('En Vivo')).toBeInTheDocument()
  })

  it('renders jobs in the table', () => {
    const jobs = [
      mockJob({ status: 'COMPLETED' }),
      mockJob({ job_id: 'def12345-0000-0000-0000-000000000000', status: 'PENDING', report_type: 'revenue_breakdown' }),
    ]
    render(<JobList {...defaultProps} jobs={jobs} total={2} />)

    expect(screen.getByText('#abc12345')).toBeInTheDocument()
    expect(screen.getByText('#def12345')).toBeInTheDocument()
    expect(screen.getByText('Engagement Analytics')).toBeInTheDocument()
    expect(screen.getByText('Revenue Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Completado')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('renders table headers', () => {
    const jobs = [mockJob()]
    render(<JobList {...defaultProps} jobs={jobs} total={1} />)

    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('Tipo de Reporte')).toBeInTheDocument()
    expect(screen.getByText('Creado')).toBeInTheDocument()
    expect(screen.getByText('Estado')).toBeInTheDocument()
    expect(screen.getByText('Acciones')).toBeInTheDocument()
  })

  it('renders correct actions per status', () => {
    const jobs = [
      mockJob({ job_id: 'a0000000-0000-0000-0000-000000000000', status: 'COMPLETED' }),
      mockJob({ job_id: 'b0000000-0000-0000-0000-000000000000', status: 'PROCESSING' }),
      mockJob({ job_id: 'c0000000-0000-0000-0000-000000000000', status: 'PENDING' }),
      mockJob({ job_id: 'd0000000-0000-0000-0000-000000000000', status: 'FAILED' }),
    ]
    render(<JobList {...defaultProps} jobs={jobs} total={4} />)

    expect(screen.getByText('Descargar')).toBeInTheDocument()
    expect(screen.getByText('Ver Log')).toBeInTheDocument()
    expect(screen.getByText('En Cola')).toBeInTheDocument()
    expect(screen.getByText('Ver Error')).toBeInTheDocument()
  })

  it('shows pagination info', () => {
    const jobs = [mockJob()]
    render(<JobList {...defaultProps} jobs={jobs} total={5} />)
    expect(screen.getByText('Mostrando 1 de 5 trabajos')).toBeInTheDocument()
  })

  it('calls onNextPage when clicking Siguiente', async () => {
    const onNextPage = vi.fn()
    const user = userEvent.setup()
    const jobs = [mockJob()]
    render(<JobList {...defaultProps} jobs={jobs} total={25} hasNext={true} onNextPage={onNextPage} />)

    await user.click(screen.getByText('Siguiente'))
    expect(onNextPage).toHaveBeenCalledOnce()
  })

  it('calls onPrevPage when clicking Anterior', async () => {
    const onPrevPage = vi.fn()
    const user = userEvent.setup()
    const jobs = [mockJob()]
    render(<JobList {...defaultProps} jobs={jobs} total={25} page={2} onPrevPage={onPrevPage} />)

    await user.click(screen.getByText('Anterior'))
    expect(onPrevPage).toHaveBeenCalledOnce()
  })

  it('disables Anterior on first page', () => {
    const jobs = [mockJob()]
    render(<JobList {...defaultProps} jobs={jobs} total={25} page={1} hasNext={true} />)
    expect(screen.getByText('Anterior')).toBeDisabled()
  })

  it('disables Siguiente when no next page', () => {
    const jobs = [mockJob()]
    render(<JobList {...defaultProps} jobs={jobs} total={1} hasNext={false} />)
    expect(screen.getByText('Siguiente')).toBeDisabled()
  })
})
