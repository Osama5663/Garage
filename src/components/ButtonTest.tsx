import React, { useState } from 'react'

const ButtonTest: React.FC = () => {
  const [clickCount, setClickCount] = useState(0)
  const [lastClicked, setLastClicked] = useState('Never')

  const handleClick = (buttonName: string) => {
    console.log(`${buttonName} button clicked!`)
    setClickCount(prev => prev + 1)
    setLastClicked(`${buttonName} at ${new Date().toLocaleTimeString()}`)
    
    // Test different click handling approaches
    setTimeout(() => {
      console.log(`${buttonName} button click processed after timeout`)
    }, 0)
  }

  return (
    <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
      <h3 className="text-lg font-semibold text-yellow-900 mb-4">Button Functionality Test</h3>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">Click Count: {clickCount}</span>
          <span className="text-sm text-gray-600">Last Clicked: {lastClicked}</span>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => handleClick('Test Button 1')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Test Button 1
          </button>
          
          <button
            onClick={(e) => {
              console.log('Test Button 2 clicked with event:', e)
              handleClick('Test Button 2')
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Test Button 2
          </button>
          
          <button
            type="button"
            onClick={() => handleClick('Test Button 3')}
            className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto"
          >
            Test Close Button Style
          </button>
        </div>
        
        <div className="text-xs text-gray-500">
          <p>Check browser console for click events</p>
          <p>Event handlers: {clickCount > 0 ? 'Working' : 'Not tested'}</p>
        </div>
      </div>
    </div>
  )
}

export default ButtonTest