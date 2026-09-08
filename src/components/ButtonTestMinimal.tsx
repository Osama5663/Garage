import React, { useState } from 'react'

const ButtonTestMinimal: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clickCount, setClickCount] = useState(0)

  const handleOpen = () => {
    console.log('ButtonTestMinimal: Opening modal')
    setIsModalOpen(true)
    setClickCount(prev => prev + 1)
  }

  const handleClose = () => {
    console.log('ButtonTestMinimal: Closing modal')
    setIsModalOpen(false)
  }

  console.log('ButtonTestMinimal: Rendering, isModalOpen:', isModalOpen, 'clickCount:', clickCount)

  return (
    <div className="p-4 bg-white rounded-lg shadow mb-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Button Test (Minimal)</h3>
      
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          Click count: {clickCount} | Modal state: {isModalOpen ? 'Open' : 'Closed'}
        </div>
        
        <button
          onClick={handleOpen}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Open Test Modal
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold">Test Modal</h4>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">
                This is a test modal to verify button functionality.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ButtonTestMinimal