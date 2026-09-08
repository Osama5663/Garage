import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import PrintPreview from '../components/PrintPreview'

describe('PrintPreview', () => {
  it('renders sections and switches content', () => {
    const sections = [
      { id: 'a', title: 'A', render: () => '<div id="a">A content</div>' },
      { id: 'b', title: 'B', render: () => '<div id="b">B content</div>' }
    ]
    render(<PrintPreview title="Test" open={true} sections={sections} onClose={() => {}} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(document.querySelector('#a')).toBeTruthy()
    fireEvent.click(screen.getByText('B'))
    expect(document.querySelector('#b')).toBeTruthy()
  })

  it('shows error indicator when render throws', () => {
    const sections = [
      { id: 'bad', title: 'Bad', render: () => { throw new Error('fail') } }
    ]
    render(<PrintPreview title="Err" open={true} sections={sections} onClose={() => {}} />)
    expect(screen.getByText(/Impossible de charger la section/i)).toBeInTheDocument()
  })
})

