import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { JobOrderPrintPage } from '../../pages/JobOrderPrintPage'
import { useJobOrderStore } from '../../stores/jobOrderStore'

describe('JobOrder print consistency', () => {
  let writes: string[]
  beforeEach(() => {
    writes = []
    
    const now = new Date().toISOString()
    const job: any = {
        id: 'job_1',
        jobNumber: 'OR-TEST-001',
        customerId: 'cust_1',
        vehicleId: 'veh_1',
        customerName: 'John Doe',
        status: 'in-progress',
        priority: 'medium',
        description: 'General inspection',
        vehicleInfo: { make: 'Toyota', model: 'Camry', year: 2019, registration: 'ABC123', vin: 'VIN123' },
        laborItems: [{ id: 'lab1', description: 'Inspection', hours: 1, rate: 0, total: 0, mechanic: 'Mike', date: '2025-11-28' }],
        partsUsed: [{ id: 'p1', partNumber: 'PN-1', name: 'Air Filter', quantity: 1, description: '', unitCost: 0, totalCost: 0, status: 'installed' }],
        notes: 'N/A',
        estimatedHours: 1,
        actualHours: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: 'tester',
        startDate: now,
        deadline: now,
        completionDate: undefined,
        estimatedCost: 0,
        finalCost: 0,
        isApproved: false,
        jobDescriptions: [],
        diagnosticFiles: [],
        attachedImages: []
      }
    useJobOrderStore.setState({ jobOrders: [job] })
    })

  const renderPrint = (search: string = '') => {
    render(
      <MemoryRouter initialEntries={[`/print/job-order/job_1${search}`]}>
        <Routes>
          <Route path="/print/job-order/:id" element={<JobOrderPrintPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('produces matching printable content for direct print URL and print page', () => {
    render(
      <MemoryRouter initialEntries={['/print/job-order/job_1?print=1']}>
        <Routes>
          <Route path="/print/job-order/:id" element={<JobOrderPrintPage />} />
        </Routes>
      </MemoryRouter>
    )

    const directRoot = document.getElementById('job-order-print-root')
    const directHtml = directRoot ? directRoot.innerHTML : ''

    cleanup()

    render(
      <MemoryRouter initialEntries={['/print/job-order/job_1']}>
        <Routes>
          <Route path="/print/job-order/:id" element={<JobOrderPrintPage />} />
        </Routes>
      </MemoryRouter>
    )

    const viewerRoot = document.getElementById('job-order-print-root')
    const viewerHtml = viewerRoot ? viewerRoot.innerHTML : ''

    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()
    
    expect(normalize(viewerHtml)).toContain('ordre de réparation')
    expect(normalize(directHtml)).toContain('ordre de réparation')
    expect(normalize(viewerHtml)).toBe(normalize(directHtml))
  })
})
