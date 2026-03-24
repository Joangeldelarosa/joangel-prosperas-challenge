import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorNotification from '../components/ErrorNotification'

describe('ErrorNotification', () => {
  it('does not render when message is null', () => {
    const { container } = render(<ErrorNotification message={null} />)
    expect(container.querySelector('.fixed')).not.toBeInTheDocument()
  })

  it('renders error notification with message', () => {
    render(<ErrorNotification message="Algo falló" type="error" />)
    expect(screen.getByText('Algo falló')).toBeInTheDocument()
  })

  it('renders success notification', () => {
    render(<ErrorNotification message="Operación exitosa" type="success" />)
    expect(screen.getByText('Operación exitosa')).toBeInTheDocument()
  })

  it('renders info notification', () => {
    render(<ErrorNotification message="Información importante" type="info" />)
    expect(screen.getByText('Información importante')).toBeInTheDocument()
  })

  it('calls onDismiss when close button is clicked', async () => {
    const onDismiss = vi.fn()
    const user = userEvent.setup()
    render(<ErrorNotification message="Cerrar esto" onDismiss={onDismiss} />)

    const closeButton = screen.getByLabelText('Cerrar notificación')
    await user.click(closeButton)
    expect(onDismiss).toHaveBeenCalled()
  })
})
