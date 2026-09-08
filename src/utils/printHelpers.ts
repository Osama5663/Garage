export async function printHtml(html: string) {
  return new Promise<void>((resolve, reject) => {
    try {
      // Use a hidden iframe for printing (cleaner experience, no new tabs)
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      // Set a reasonable width/height for the iframe to ensure responsive layouts render correctly before printing
      iframe.style.width = '210mm' 
      iframe.style.height = '297mm'
      iframe.style.border = '0'
      // Use opacity 0 and pointer-events none instead of visibility hidden
      iframe.style.opacity = '0'
      iframe.style.pointerEvents = 'none'
      iframe.style.zIndex = '-1'
      
      document.body.appendChild(iframe)
      
      const doc = iframe.contentWindow?.document
      if (!doc) {
        throw new Error('Failed to create print iframe')
      }

      const htmlWithBase = html.includes('<head>')
        ? html.replace('<head>', `<head><base href="${location.origin}">`)
        : `<!DOCTYPE html><html><head><base href="${location.origin}"></head><body>${html}</body></html>`

      doc.open()
      doc.write(htmlWithBase)
      doc.close()

      // Function to trigger print and cleanup
      const triggerPrint = () => {
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
          resolve() // Resolve immediately after triggering print
        } catch (e) {
          reject(e)
        } finally {
          // Cleanup: Remove iframe after a delay to allow the print job to be spooled
          // Chrome/Edge need the iframe to exist during the print dialog
          setTimeout(() => {
            try { 
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe) 
              }
            } catch {}
          }, 60000)
        }
      }

      // Check if ready
      if (iframe.contentWindow?.document.readyState === 'complete') {
        // Wait a small tick for reflow
        setTimeout(triggerPrint, 500)
      } else {
        iframe.onload = () => setTimeout(triggerPrint, 500)
      }

    } catch (e) {
      console.error('Print failed:', e)
      reject(e)
    }
  })
}
