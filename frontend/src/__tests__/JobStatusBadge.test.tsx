import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import JobStatusBadge from '../components/JobStatusBadge'

describe('JobStatusBadge', () => {
  it('renders COMPLETED status', () => {
    render(<JobStatusBadge status="COMPLETED" />)
    expect(screen.getByText('Completado')).toBeInTheDocument()
  })

  it('renders PROCESSING status with progress bar', () => {
    const { container } = render(<JobStatusBadge status="PROCESSING" />)
    expect(screen.getByText('Procesando')).toBeInTheDocument()
    // Progress bar should be visible
    const progressBar = container.querySelector('.animate-pulse')
    expect(progressBar).toBeInTheDocument()
  })

  it('renders PENDING status', () => {
    render(<JobStatusBadge status="PENDING" />)
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('renders FAILED status', () => {
    render(<JobStatusBadge status="FAILED" />)
    expect(screen.getByText('Fallido')).toBeInTheDocument()
  })

  it('does not show progress bar for non-PROCESSING statuses', () => {
    const { container } = render(<JobStatusBadge status="COMPLETED" />)
    const progressBar = container.querySelector('.animate-pulse')
    expect(progressBar).not.toBeInTheDocument()
  })
})
