import { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Search, Save, X, GripVertical } from 'lucide-react';

interface TaskItem {
  id: string;
  order: number;
  reference: string;
  designation: string;
  type: string;
  quantity: number;
  unitPriceHT: number;
  vatRate: number;
  unitPriceTTC: number;
  discount: number;
  totalTTC: number;
  notes?: string;
}

interface TaskFormData {
  reference: string;
  designation: string;
  type: string;
  quantity: number;
  unitPriceHT: number;
  vatRate: number;
  discount: number;
  notes: string;
}

const taskTypes = [
  'Spare Part',
  'Labor',
  'Consumable',
  'Service',
  'Package',
  'Other'
];

const vatRates = [0, 5.5, 10, 20];

export default function TaskManagementTable() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<TaskFormData>({
    reference: '',
    designation: '',
    type: 'Pièce détachée',
    quantity: 1,
    unitPriceHT: 0,
    vatRate: 20,
    discount: 0,
    notes: ''
  });

  // Load tasks from localStorage on mount
  useEffect(() => {
    const savedTasks = localStorage.getItem('garage-task-items');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, []);

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem('garage-task-items', JSON.stringify(tasks));
  }, [tasks]);

  const calculatePrices = (data: TaskFormData): { unitPriceTTC: number; totalTTC: number } => {
    const unitPriceTTC = data.unitPriceHT * (1 + data.vatRate / 100);
    const discountedPrice = unitPriceTTC * (1 - data.discount / 100);
    const totalTTC = discountedPrice * data.quantity;
    
    return {
      unitPriceTTC: parseFloat(unitPriceTTC.toFixed(2)),
      totalTTC: parseFloat(totalTTC.toFixed(2))
    };
  };

  const addTask = () => {
    if (!formData.designation.trim()) return;

    const { unitPriceTTC, totalTTC } = calculatePrices(formData);
    
    const newTask: TaskItem = {
      id: Date.now().toString(),
      order: tasks.length + 1,
      ...formData,
      unitPriceTTC,
      totalTTC
    };

    setTasks([...tasks, newTask]);
    resetForm();
  };

  const updateTask = (taskId: string, updates: Partial<TaskItem>) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const resetForm = () => {
    setFormData({
      reference: '',
      designation: '',
      type: 'Pièce détachée',
      quantity: 1,
      unitPriceHT: 0,
      vatRate: 20,
      discount: 0,
      notes: ''
    });
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const startEdit = (task: TaskItem) => {
    setFormData({
      reference: task.reference,
      designation: task.designation,
      type: task.type,
      quantity: task.quantity,
      unitPriceHT: task.unitPriceHT,
      vatRate: task.vatRate,
      discount: task.discount,
      notes: task.notes || ''
    });
    setEditingTask(task.id);
    setIsFormOpen(true);
  };

  const saveEdit = () => {
    if (!formData.designation.trim() || !editingTask) return;

    const { unitPriceTTC, totalTTC } = calculatePrices(formData);
    
    updateTask(editingTask, {
      ...formData,
      unitPriceTTC,
      totalTTC
    });
    resetForm();
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedTask || draggedTask === targetTaskId) return;

    const draggedIndex = tasks.findIndex(t => t.id === draggedTask);
    const targetIndex = tasks.findIndex(t => t.id === targetTaskId);

    const newTasks = [...tasks];
    const [removed] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(targetIndex, 0, removed);

    // Update order numbers
    const updatedTasks = newTasks.map((task, index) => ({
      ...task,
      order: index + 1
    }));

    setTasks(updatedTasks);
    setDraggedTask(null);
  };

  const getTotalAmount = () => {
    return tasks.reduce((total, task) => total + task.totalTTC, 0);
  };

  const filteredTasks = tasks.filter(task =>
    task.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-600">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" x2="8" y1="13" y2="13"></line>
                <line x1="16" x2="8" y1="17" y2="17"></line>
                <line x1="10" x2="8" y1="9" y2="9"></line>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Task Management</h2>
              <p className="text-sm text-gray-600">Manage parts, labor and services</p>
            </div>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Add task"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by reference, designation or type..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Task Form */}
      {isFormOpen && (
        <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Reference"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Designation"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {taskTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price Excl. VAT ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.unitPriceHT}
                onChange={(e) => setFormData({ ...formData, unitPriceHT: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VAT (%)</label>
              <select
                value={formData.vatRate}
                onChange={(e) => setFormData({ ...formData, vatRate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {vatRates.map(rate => (
                  <option key={rate} value={rate}>{rate}%</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              type="button"
            >
              <X className="w-4 h-4 inline mr-2" />
Cancel
            </button>
            <button
              onClick={editingTask ? saveEdit : addTask}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="button"
            >
              <Save className="w-4 h-4 inline mr-2" />
{editingTask ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Tasks Table */}
      <div className="px-6 py-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 mx-auto">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                <path d="M12 9v4"></path>
                <path d="M12 17h.01"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No results for your search' : 'Start by adding your first task'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add task</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Order</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reference</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Designation</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Qty</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Unit Price Excl. VAT</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">VAT</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Unit Price Incl. VAT</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Discount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Incl. VAT</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks
                  .sort((a, b) => a.order - b.order)
                  .map((task) => (
                    <tr
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, task.id)}
                      className={`border-b border-gray-200 hover:bg-gray-50 ${
                        draggedTask === task.id ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                          <span>{task.order}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{task.reference || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{task.designation}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{task.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center">{task.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">${task.unitPriceHT.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{task.vatRate}%</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">${task.unitPriceTTC.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{task.discount}%</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">${task.totalTTC.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => startEdit(task)}
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                            aria-label="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Total Summary */}
      {tasks.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <div className="bg-blue-100 border border-blue-200 rounded-lg px-6 py-3">
              <div className="text-sm text-blue-800 font-medium">Total Incl. VAT</div>
              <div className="text-2xl font-bold text-blue-900">${getTotalAmount().toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}