import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import JobOrderDashboard from '../components/JobOrderDashboard';
import { useAuthStore } from '../stores/authStore';

// Mock mechanics data - in a real app, this would come from your backend
const mockMechanics = [
  { id: '1', name: 'John Smith', hourlyRate: 75, availability: 'available' },
  { id: '2', name: 'Mike Johnson', hourlyRate: 80, availability: 'available' },
  { id: '3', name: 'Sarah Williams', hourlyRate: 85, availability: 'busy' },
  { id: '4', name: 'David Brown', hourlyRate: 70, availability: 'available' },
  { id: '5', name: 'Lisa Davis', hourlyRate: 78, availability: 'available' }
];

export default function JobOrderDashboardPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [tasks, setTasks] = useState<Array<{id: string; designation: string; mechanic: string; estimatedHours: number; hourlyRate: number; price: number}>>([]);
  const [customerName, setCustomerName] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState({
    make: '',
    model: '',
    year: '',
    vin: '',
    registration: ''
  });

  const handleTasksChange = (newTasks: Array<{id: string; designation: string; mechanic: string; estimatedHours: number; hourlyRate: number; price: number}>) => {
    setTasks(newTasks);
  };

  const handleCreateJobOrder = () => {
    if (tasks.length === 0) {
      alert('Please add at least one task to create a job order.');
      return;
    }

    if (!customerName || !vehicleInfo.make || !vehicleInfo.model) {
      alert('Please fill in customer and vehicle information.');
      return;
    }

    // Calculate totals
    const totalHours = tasks.reduce((total, task) => total + task.estimatedHours, 0);
    const totalCost = tasks.reduce((total, task) => total + task.price, 0);

    // Create job order data
    const jobOrderData = {
      customerName,
      vehicleInfo,
      tasks,
      totalHours,
      totalCost,
      createdBy: currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : 'System',
      createdAt: new Date().toISOString()
    };

    console.log('Creating job order:', jobOrderData);
    
    // In a real app, you would save this to your backend
    alert(`Job order created successfully!\n\nTotal Hours: ${totalHours}h\nTotal Cost: $${totalCost.toFixed(2)}\nTasks: ${tasks.length}`);
    
    // Navigate to job orders list or clear form
    navigate('/job-orders');
  };

  const handleClearForm = () => {
    setTasks([]);
    setCustomerName('');
    setVehicleInfo({
      make: '',
      model: '',
      year: '',
      vin: '',
      registration: ''
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Order Dashboard</h1>
          <p className="text-gray-600">Create and manage job orders with task assignments and pricing</p>
        </div>

        {/* Customer and Vehicle Information */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Customer & Vehicle Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Make *</label>
              <input
                type="text"
                value={vehicleInfo.make}
                onChange={(e) => setVehicleInfo({ ...vehicleInfo, make: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Toyota, Ford"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Model *</label>
              <input
                type="text"
                value={vehicleInfo.model}
                onChange={(e) => setVehicleInfo({ ...vehicleInfo, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Camry, F-150"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                value={vehicleInfo.year}
                onChange={(e) => setVehicleInfo({ ...vehicleInfo, year: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="2020"
                min="1900"
                max="2030"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
              <input
                type="text"
                value={vehicleInfo.vin}
                onChange={(e) => setVehicleInfo({ ...vehicleInfo, vin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Vehicle Identification Number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration</label>
              <input
                type="text"
                value={vehicleInfo.registration}
                onChange={(e) => setVehicleInfo({ ...vehicleInfo, registration: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="License plate number"
              />
            </div>
          </div>
        </div>

        {/* Job Order Dashboard */}
        <JobOrderDashboard
          onTasksChange={handleTasksChange}
          mechanics={mockMechanics}
          defaultHourlyRate={75}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={handleClearForm}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Form
          </button>
          <button
            onClick={handleCreateJobOrder}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Create Job Order
          </button>
        </div>
      </div>
    </div>
  );
}