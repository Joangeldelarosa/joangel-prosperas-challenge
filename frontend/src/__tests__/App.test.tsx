import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  it('renders login form when not authenticated', () => {
    localStorage.clear()
    render(<App />)
    expect(screen.getByText('Prosperas')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeTruthy()
    expect(screen.getByPlaceholderText('Enter your username')).toBeTruthy()
    expect(screen.getByPlaceholderText('Enter your password')).toBeTruthy()
  })
})
