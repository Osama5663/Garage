import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import DocumentViewer from '../components/DocumentViewer'

describe('DocumentViewer (HTML)', () => {
  it('renders html content and shows page count', async () => {
    const html = '<div id="doc">Hello</div>'
    render(<DocumentViewer title="Doc" source={{ type: 'html', html }} open={true} onClose={() => {}} />)
    expect(document.querySelector('#doc')).toBeTruthy()
    expect(screen.getByText(/1 \//)).toBeInTheDocument()
  })

  it('navigates pages disabled when single page', () => {
    const html = '<div>Only one</div>'
    render(<DocumentViewer title="Doc" source={{ type: 'html', html }} open={true} onClose={() => {}} />)
    const prev = screen.getByLabelText('Page précédente')
    const next = screen.getByLabelText('Page suivante')
    expect(prev).toBeDisabled()
    expect(next).toBeDisabled()
  })
})

