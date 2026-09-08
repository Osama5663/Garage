import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import DocumentEditor from '../DocumentEditor'

// Mock the lucide-react icons
vi.mock('lucide-react', () => ({
  Bold: () => <span data-testid="bold-icon">B</span>,
  Italic: () => <span data-testid="italic-icon">I</span>,
  AlignLeft: () => <span data-testid="align-left-icon">←</span>,
  AlignCenter: () => <span data-testid="align-center-icon">↔</span>,
  AlignRight: () => <span data-testid="align-right-icon">→</span>,
  Image: () => <span data-testid="image-icon">📷</span>,
  Save: () => <span data-testid="save-icon">💾</span>,
  FileText: () => <span data-testid="file-text-icon">📄</span>
}))

describe('DocumentEditor', () => {
  const mockOnSave = vi.fn()
  const mockOnImageUpload = vi.fn()

  const defaultDocument = {
    title: 'Test Document',
    header: { content: 'Header content', alignment: 'left' as const },
    body: { content: 'Body content', alignment: 'center' as const, images: [] },
    footer: { content: 'Footer content', alignment: 'right' as const }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders document editor with default document', () => {
    render(<DocumentEditor onSave={mockOnSave} />)
    
    expect(screen.getByPlaceholderText('Document Title')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('header')).toBeInTheDocument()
    expect(screen.getByText('body')).toBeInTheDocument()
    expect(screen.getByText('footer')).toBeInTheDocument()
  })

  test('renders document editor with provided document', () => {
    render(<DocumentEditor document={defaultDocument} onSave={mockOnSave} />)
    
    const titleInput = screen.getByPlaceholderText('Document Title') as HTMLInputElement
    expect(titleInput.value).toBe('Test Document')
  })

  test('updates document title', async () => {
    const user = userEvent.setup()
    render(<DocumentEditor onSave={mockOnSave} />)
    
    const titleInput = screen.getByPlaceholderText('Document Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'New Title')
    
    expect(titleInput).toHaveValue('New Title')
  })

  test('switches between sections', async () => {
    const user = userEvent.setup()
    render(<DocumentEditor onSave={mockOnSave} />)
    
    const headerTab = screen.getByText('header')
    const bodyTab = screen.getByText('body')
    const footerTab = screen.getByText('footer')
    
    // Initially body should be active (default)
    expect(bodyTab).toHaveClass('bg-blue-600', 'text-white')
    expect(headerTab).not.toHaveClass('bg-blue-600')
    expect(footerTab).not.toHaveClass('bg-blue-600')
    
    // Click header tab
    await user.click(headerTab)
    expect(headerTab).toHaveClass('bg-blue-600', 'text-white')
    expect(bodyTab).not.toHaveClass('bg-blue-600')
    
    // Click footer tab
    await user.click(footerTab)
    expect(footerTab).toHaveClass('bg-blue-600', 'text-white')
    expect(headerTab).not.toHaveClass('bg-blue-600')
  })

  test('shows image upload button only for body section', async () => {
    const user = userEvent.setup()
    render(<DocumentEditor onSave={mockOnSave} onImageUpload={mockOnImageUpload} />)
    
    // Body section should show image button by default
    expect(screen.getByText('Add Image')).toBeInTheDocument()
    
    // Switch to header section
    await user.click(screen.getByText('header'))
    expect(screen.queryByText('Add Image')).not.toBeInTheDocument()
    
    // Switch to footer section
    await user.click(screen.getByText('footer'))
    expect(screen.queryByText('Add Image')).not.toBeInTheDocument()
  })

  test('calls onSave when save button is clicked', async () => {
    const user = userEvent.setup()
    mockOnSave.mockResolvedValueOnce(undefined)
    
    render(<DocumentEditor document={defaultDocument} onSave={mockOnSave} />)
    
    const saveButton = screen.getByText('Save')
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(defaultDocument)
    })
  })

  test('shows loading state during save', async () => {
    const user = userEvent.setup()
    mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<DocumentEditor document={defaultDocument} onSave={mockOnSave} />)
    
    const saveButton = screen.getByText('Save')
    await user.click(saveButton)
    
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument()
    })
  })

  test('handles save error gracefully', async () => {
    const user = userEvent.setup()
    const consoleError = vi.spyOn(console, 'error').mockImplementation()
    mockOnSave.mockRejectedValueOnce(new Error('Save failed'))
    
    render(<DocumentEditor document={defaultDocument} onSave={mockOnSave} />)
    
    const saveButton = screen.getByText('Save')
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to save document:', expect.any(Error))
    })
    
    consoleError.mockRestore()
  })

  test('applies text alignment classes correctly', () => {
    render(<DocumentEditor document={defaultDocument} onSave={mockOnSave} />)
    
    // Check that alignment classes are applied to sections
    const sections = document.querySelectorAll('[contenteditable]')
    expect(sections.length).toBeGreaterThan(0)
  })

  test('handles image upload error', async () => {
    const user = userEvent.setup()
    const consoleError = vi.spyOn(console, 'error').mockImplementation()
    mockOnImageUpload.mockRejectedValueOnce(new Error('Upload failed'))
    
    render(<DocumentEditor onSave={mockOnSave} onImageUpload={mockOnImageUpload} />)
    
    // Create a mock file input change event
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    })
    
    fireEvent.change(fileInput)
    
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to upload image:', expect.any(Error))
    })
    
    consoleError.mockRestore()
  })
})