import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PrintableBillOfLading from '../PrintableBillOfLading'

// Mock the formatters (use correct relative path from __tests__ folder)
vi.mock('../../utils/formatters', () => ({
  formatCurrency: (value: number) => `$${value.toFixed(2)}`,
  formatDate: (date: string) => new Date(date).toLocaleDateString()
}))

describe('PrintableBillOfLading', () => {
  const mockData = {
    blNumber: 'BL-TEST-001',
    issueDate: '2025-11-28T20:00:21',
    dueDate: '2025-12-05T20:00:21',
    client: {
      name: 'John Smith',
      phone: '(555) 123-4567',
      address: '123 Main St, Springfield, IL 62701',
      clientId: '1'
    },
    vehicle: {
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      vin: 'TEST123456789',
      licensePlate: 'ABC123'
    },
    parts: [
      {
        partNumber: 'BT-7890',
        description: 'Battery',
        quantity: 1
      }
    ],
    labor: [
      {
        description: 'Engine Repair',
        hours: 2.5,
        rate: 75,
        total: 187.50
      }
    ]
  }

  it('renders the Bill of Lading header correctly', () => {
    render(<PrintableBillOfLading data={mockData} />)
    
    expect(screen.getByText('Bon de Livraison')).toBeInTheDocument()
    expect(screen.getByText('BL-TEST-001')).toBeInTheDocument()
  })

  it('displays client details correctly', () => {
    render(<PrintableBillOfLading data={mockData} />)
    
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getAllByText(/\(555\) 123-4567/).length).toBeGreaterThan(0)
    expect(screen.getByText('123 Main St, Springfield, IL 62701')).toBeInTheDocument()
  })

  it('displays vehicle information correctly', () => {
    render(<PrintableBillOfLading data={mockData} />)
    
    expect(screen.getByText(/Véhicule:\s*Toyota Camry \(2020\)/)).toBeInTheDocument()
    expect(screen.getByText(/VIN:\s*TEST123456789/)).toBeInTheDocument()
    expect(screen.getByText(/Immatriculation:\s*ABC123/)).toBeInTheDocument()
  })

  it('displays parts used correctly', () => {
    render(<PrintableBillOfLading data={mockData} />)
    
    expect(screen.getByText('BT-7890')).toBeInTheDocument()
    expect(screen.getByText('Battery')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('displays labor details correctly', () => {
    render(<PrintableBillOfLading data={mockData} />)
    
    expect(screen.getByText('Engine Repair')).toBeInTheDocument()
    expect(screen.getByText('2.5')).toBeInTheDocument()
    expect(screen.getByText('$75.00')).toBeInTheDocument()
    expect(screen.getAllByText('$187.50').length).toBeGreaterThan(0)
  })

  it('uses default company info when not provided', () => {
    render(<PrintableBillOfLading data={mockData} />)
    
    expect(screen.getAllByText('GaragePro Auto Services').length).toBeGreaterThan(0)
    expect(screen.getAllByText('123 Main Street, Auto City, AC 12345').length).toBeGreaterThan(0)
  })

  it('uses custom company info when provided', () => {
    const customCompanyInfo = {
      name: 'Custom Garage',
      address: '456 Custom Street, Custom City, CC1 2DD',
      phone: '09876 543210',
      email: 'custom@garage.com'
    }
    
    render(<PrintableBillOfLading data={mockData} companyInfo={customCompanyInfo} />)
    
    expect(screen.getAllByText('Custom Garage').length).toBeGreaterThan(0)
    expect(screen.getAllByText('456 Custom Street, Custom City, CC1 2DD').length).toBeGreaterThan(0)
  })
})
