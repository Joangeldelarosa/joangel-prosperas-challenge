import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Layout from '../components/Layout'

describe('Layout', () => {
  it('renders brand name and subtitle', () => {
    render(<Layout><p>Content</p></Layout>)
    expect(screen.getByText('Prosperas')).toBeInTheDocument()
    expect(screen.getByText('Reports Challenge')).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(<Layout><p>Test content</p></Layout>)
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders username and logout button when authenticated', () => {
    const onLogout = vi.fn()
    render(<Layout username="johndoe" onLogout={onLogout}><p>Content</p></Layout>)

    expect(screen.getByText('johndoe')).toBeInTheDocument()
    expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument()
  })

  it('calls onLogout when clicking Cerrar Sesión', async () => {
    const onLogout = vi.fn()
    const user = userEvent.setup()
    render(<Layout username="johndoe" onLogout={onLogout}><p>Content</p></Layout>)

    await user.click(screen.getByText('Cerrar Sesión'))
    expect(onLogout).toHaveBeenCalledOnce()
  })

  it('renders user avatar with first letter capitalized', () => {
    render(<Layout username="johndoe"><p>Content</p></Layout>)
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('does not render user section when username is not provided', () => {
    render(<Layout><p>Content</p></Layout>)
    expect(screen.queryByText('Cerrar Sesión')).not.toBeInTheDocument()
  })
})
