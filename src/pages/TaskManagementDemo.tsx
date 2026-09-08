import TaskManagementTable from '../components/TaskManagementTable';

export default function TaskManagementDemo() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Task Management System</h1>
          <p className="text-gray-600">Comprehensive task management with table layout, pricing, and drag-and-drop functionality</p>
        </div>

        {/* Main Task Management Component */}
        <TaskManagementTable />

        {/* Feature Overview */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Features Implemented</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">Task Management</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ Add new tasks with form validation</li>
                <li>✓ Edit existing tasks inline</li>
                <li>✓ Delete tasks with confirmation</li>
                <li>✓ Auto-calculate prices (Excl. VAT → Incl. VAT)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">User Interface</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ English language interface</li>
                <li>✓ Professional table layout</li>
                <li>✓ Responsive design</li>
                <li>✓ Color-coded priority levels</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">Advanced Features</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ Drag-and-drop reordering</li>
                <li>✓ Search and filter functionality</li>
                <li>✓ LocalStorage persistence</li>
                <li>✓ VAT calculation (0%, 5.5%, 10%, 20%)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>1. Add Tasks:</strong> Click "Ajouter" to open the form and add new tasks</p>
            <p><strong>2. Edit Tasks:</strong> Click the edit icon to modify existing tasks</p>
            <p><strong>3. Reorder:</strong> Drag tasks using the grip icon to reorder them</p>
            <p><strong>4. Search:</strong> Use the search bar to filter tasks by reference, designation, or type</p>
            <p><strong>5. Pricing:</strong> System automatically calculates TTC prices from HT values with VAT</p>
          </div>
        </div>
      </div>
    </div>
  );
}