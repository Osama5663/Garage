// Test script to add job descriptions for comprehensive testing
import { useJobDescriptionStore } from '../src/stores/jobDescriptionStore'

// Add test job descriptions
const addTestJobDescriptions = () => {
  const { addDescription } = useJobDescriptionStore.getState()
  
  // Job Description 1: Brake pad replacement
  addDescription({
    title: 'Brake Pad Replacement',
    description: 'Replace front brake pads and resurface rotors. Check brake fluid levels and test brake system functionality.',
    priority: 'high',
    estimatedHours: 2.5
  })
  
  // Job Description 2: Oil change service
  addDescription({
    title: 'Oil Change Service',
    description: 'Complete oil change with filter replacement. Check all fluid levels and perform basic vehicle inspection.',
    priority: 'medium',
    estimatedHours: 1.0
  })
  
  console.log('Test job descriptions added successfully')
  console.log('Current job descriptions:', useJobDescriptionStore.getState().descriptions)
}

// Execute the test
addTestJobDescriptions()