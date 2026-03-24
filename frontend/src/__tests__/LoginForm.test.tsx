import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '../components/LoginForm'

const defaultProps = {
  onLogin: vi.fn(),
  onRegister: vi.fn(),
  loading: false,
  error: null,
}

describe('LoginForm', () => {
  it('renders login form by default', () => {
    render(<LoginForm {...defaultProps} />)
    expect(screen.getByRole('heading', { name: 'Iniciar Sesión' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ingresa tu usuario')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ingresa tu contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar Sesión' })).toBeInTheDocument()
  })

  it('toggles to register mode', async () => {
    const user = userEvent.setup()
    render(<LoginForm {...defaultProps} />)

    await user.click(screen.getByText('¿No tienes cuenta? Regístrate'))

    // After toggle, the register heading and button should appear
    const heading = await screen.findByText((content, element) => {
      return element?.tagName === 'H2' && content === 'Crear Cuenta'
    })
    expect(heading).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Crear Cuenta/ })).toBeInTheDocument()
    expect(screen.getByText('¿Ya tienes cuenta? Iniciar Sesión')).toBeInTheDocument()
  })

  it('calls onLogin when submitting login form', async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<LoginForm {...defaultProps} onLogin={onLogin} />)

    await user.type(screen.getByPlaceholderText('Ingresa tu usuario'), 'testuser')
    await user.type(screen.getByPlaceholderText('Ingresa tu contraseña'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))

    expect(onLogin).toHaveBeenCalledWith('testuser', 'password123')
  })

  it('calls onRegister when submitting register form', async () => {
    const onRegister = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<LoginForm {...defaultProps} onRegister={onRegister} />)

    await user.click(screen.getByText('¿No tienes cuenta? Regístrate'))
    await user.type(screen.getByPlaceholderText('Ingresa tu usuario'), 'newuser')
    await user.type(screen.getByPlaceholderText('Ingresa tu contraseña'), 'newpass123')
    await user.click(screen.getByRole('button', { name: 'Crear Cuenta' }))

    expect(onRegister).toHaveBeenCalledWith('newuser', 'newpass123')
  })

  it('displays error message when error prop is set', () => {
    render(<LoginForm {...defaultProps} error="Credenciales inválidas" />)
    expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument()
  })

  it('disables submit button when loading', () => {
    render(<LoginForm {...defaultProps} loading={true} />)
    expect(screen.getByRole('button', { name: 'Espera...' })).toBeDisabled()
  })
})
