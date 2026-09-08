import '@testing-library/jest-dom'
import { vi } from 'vitest'

const mapConsoleArgs = (args: any[]) =>
  args.map((a) => {
    if (a instanceof Error) return `${a.name}: ${a.message}`
    if (a && typeof a === 'object') {
      try {
        return JSON.stringify(a)
      } catch {
        return String(a)
      }
    }
    return a
  })

const originalConsoleError = console.error
console.error = (...args: any[]) => originalConsoleError(...mapConsoleArgs(args))

if (typeof process !== 'undefined') {
  process.on('unhandledRejection', () => {})
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as any

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.sessionStorage = sessionStorageMock as any
