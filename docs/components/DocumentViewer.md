DocumentViewer Component

Overview
- A reusable document view modal that renders printable content with zoom, fullscreen, and navigation controls.
- Preserves print/export as secondary actions inside the viewer.

Props
- title: string
- isOpen: boolean
- onClose: () => void
- content?: ReactNode
- pages?: ReactNode[] (use for multipage)
- onPrint?: () => void
- onExport?: () => void

Features
- Zoom in/out and reset
- Fullscreen toggle
- Page navigation when `pages` provided
- Loading indicator
- Accessible: dialog role, aria-modal, labelled by title, keyboard shortcuts (Esc close, +/- zoom, f fullscreen, arrows navigate)

Usage
- Import and pass printable content, e.g. `<PrintableJobOrder jobOrder={jo} />`
- Provide `onPrint` and `onExport` to reuse existing functions

