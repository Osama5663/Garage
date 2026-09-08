import React, { useEffect } from 'react'
import { useJobOrderStore } from '../stores/jobOrderStore'

const PersistenceTest: React.FC = () => {
  const { jobOrders, isPersisted, initializeStore } = useJobOrderStore()

  useEffect(() => {
    console.log('PersistenceTest mounted')
    console.log('Current job orders:', jobOrders.length)
    console.log('Is persisted:', isPersisted)
    
    if (jobOrders.length === 0) {
      console.log('No job orders found, initializing store...')
      initializeStore()
    }
  }, [jobOrders.length, isPersisted, initializeStore])

  return (
    <div className="p-4 bg-blue-50 rounded-lg mb-4">
      <h3 className="text-lg font-semibold text-blue-900 mb-2">Persistence Status</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Job Orders Count:</span>
          <span className="font-medium">{jobOrders.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Persisted Status:</span>
          <span className={`font-medium ${isPersisted ? 'text-green-600' : 'text-red-600'}`}>
            {isPersisted ? '✓ Persisted' : '✗ Not Persisted'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Storage Status:</span>
          <span className="font-medium">
            {typeof window !== 'undefined' && window.localStorage ? 'LocalStorage Available' : 'No LocalStorage'}
          </span>
        </div>
      </div>
      <button 
        onClick={() => {
          console.log('Testing persistence...')
          console.log('Current job orders:', jobOrders)
          console.log('LocalStorage keys:', Object.keys(localStorage))
          console.log('Job order storage:', localStorage.getItem('job-order-storage'))
        }}
        className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
      >
        Debug Info
      </button>
    </div>
  )
}

export default PersistenceTest