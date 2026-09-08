import React, { useState } from 'react'
import PrintableBillOfLading from './PrintableBillOfLading'
import BillOfLadingPrintStyles from './BillOfLadingPrintStyles'

const BillOfLadingDemo: React.FC = () => {
  const [showPrintView, setShowPrintView] = useState(false)

  // Sample data based on the OCR information provided
  const sampleData = {
    blNumber: 'BL-1-20251128',
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
      vin: 'Not provided',
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
      // No labor services in the sample data
    ]
  }

  const handlePrint = () => {
    setShowPrintView(true)
    setTimeout(() => {
      window.print()
      setShowPrintView(false)
    }, 100)
  }

  if (showPrintView) {
    return (
      <div>
        <BillOfLadingPrintStyles isVisible={true} />
        <PrintableBillOfLading data={sampleData} />
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Bill of Lading Demo</h1>
          <button
            onClick={handlePrint}
            className="print-button bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Print Bill of Lading
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Preview Header */}
          <div className="bg-gray-100 px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">Document Preview</h2>
            <p className="text-sm text-gray-600">This is how your Bill of Lading will appear when printed</p>
          </div>

          {/* Document Preview */}
          <div className="p-6">
            <BillOfLadingPrintStyles isVisible={true} />
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <PrintableBillOfLading data={sampleData} />
            </div>
          </div>
        </div>

        {/* Data Summary */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Document Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900">BL Number</h4>
              <p className="text-blue-700">{sampleData.blNumber}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900">Issue Date</h4>
              <p className="text-green-700">{new Date(sampleData.issueDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900">Due Date</h4>
              <p className="text-yellow-700">{new Date(sampleData.dueDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900">Parts Count</h4>
              <p className="text-purple-700">{sampleData.parts.length}</p>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-medium mb-2">Key Features:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Streamlined design with only essential information</li>
              <li>Professional layout optimized for printing</li>
              <li>Clear section headers and organized content</li>
              <li>Legal notice and signature areas included</li>
              <li>Monochrome design for cost-effective printing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BillOfLadingDemo