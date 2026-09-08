export function installAbortLogFilter() {
  const shouldSilence = (msg: any): boolean => {
    try {
      const s = String(msg || '')
      return s.includes('net::ERR_ABORTED') || s.includes('AbortError') || s.includes('ERR_NETWORK_IO_SUSPENDED') || s.includes('@vite/client')
    } catch { return false }
  }

  const originalError = console.error
  console.error = function (...args: any[]) {
    if (args.some(shouldSilence)) return
    originalError.apply(console, args as any)
  }

  const originalWarn = console.warn
  console.warn = function (...args: any[]) {
    if (args.some(shouldSilence)) return
    originalWarn.apply(console, args as any)
  }

  window.addEventListener('error', (e) => {
    const msg = (e as any)?.message || (e as any)?.error?.message
    if (shouldSilence(msg)) {
      e.preventDefault()
    }
  }, true)

  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const reason: any = e.reason
    const msg = reason?.message || reason?.name || reason
    if (shouldSilence(msg)) {
      e.preventDefault()
    }
  })
}
