import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JobForm from '../components/JobForm'

describe('JobForm', () => {
  it('renders all form elements', () => {
    render(<JobForm onSubmit={vi.fn()} />)

    expect(screen.getByText('Solicitar Reporte')).toBeInTheDocument()
    expect(screen.getByText('Tipo de Reporte')).toBeInTheDocument()
    expect(screen.getByText('Rango de Fechas')).toBeInTheDocument()
    expect(screen.getByText('Formato')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generar Reporte' })).toBeInTheDocument()
  })

  it('renders all report type options', () => {
    render(<JobForm onSubmit={vi.fn()} />)

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(options[0]).toHaveTextContent('Analítica de Engagement')
    expect(options[1]).toHaveTextContent('Desglose de Ingresos')
    expect(options[2]).toHaveTextContent('Resumen de Crecimiento')
  })

  it('renders format radio buttons (PDF, CSV, JSON)', () => {
    render(<JobForm onSubmit={vi.fn()} />)

    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('CSV')).toBeInTheDocument()
    expect(screen.getByText('JSON')).toBeInTheDocument()
  })

  it('submits form with correct data', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<JobForm onSubmit={onSubmit} />)

    // Select report type
    await user.selectOptions(screen.getByRole('combobox'), 'revenue_breakdown')

    // Select CSV format
    const csvRadio = screen.getByDisplayValue('csv')
    await user.click(csvRadio)

    // Submit
    await user.click(screen.getByRole('button', { name: 'Generar Reporte' }))

    expect(onSubmit).toHaveBeenCalledWith({
      report_type: 'revenue_breakdown',
      date_range: { start: '2025-01-01', end: '2025-12-31' },
      format: 'csv',
    })
  })

  it('disables submit button when loading', () => {
    render(<JobForm onSubmit={vi.fn()} loading={true} />)
    expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled()
  })

  it('shows queue status info section', () => {
    render(<JobForm onSubmit={vi.fn()} />)
    expect(screen.getByText('Estado de la Cola')).toBeInTheDocument()
  })
})
