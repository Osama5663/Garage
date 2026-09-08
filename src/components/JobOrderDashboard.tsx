import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Save, X, Calculator, User, Clock, DollarSign, Wrench } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface Task {
  id: string;
  designation: string;
  mechanic: string;
  estimatedHours: number;
  hourlyRate: number;
  price: number;
}

interface JobOrderDashboardProps {
  onTasksChange?: (tasks: Task[]) => void;
  initialTasks?: Task[];
  mechanics?: Array<{ id: string; name: string; hourlyRate: number; availability: string }>;
  defaultHourlyRate?: number;
}

const commonTasks = [
  'Oil Change',
  'Brake Inspection',
  'Tire Rotation',
  'Engine Diagnostic',
  'Transmission Service',
  'Coolant Flush',
  'Air Filter Replacement',
  'Battery Test',
  'Suspension Check',
  'Exhaust System Inspection',
  'Electrical System Check',
  'AC System Service',
  'Fuel System Cleaning',
  'Wheel Alignment',
  'Safety Inspection'
];

export default function JobOrderDashboard({ 
  onTasksChange, 
  initialTasks = [], 
  mechanics = [],
  defaultHourlyRate = 75 
}: JobOrderDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    designation: '',
    mechanic: '',
    estimatedHours: 0,
    hourlyRate: defaultHourlyRate,
    price: 0
  });
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Auto-calculate price when hours or rate changes
  useEffect(() => {
    if (newTask.estimatedHours && newTask.hourlyRate) {
      setNewTask(prev => ({
        ...prev,
        price: prev.estimatedHours! * prev.hourlyRate!
      }));
    }
  }, [newTask.estimatedHours, newTask.hourlyRate]);

  // Notify parent of task changes
  useEffect(() => {
    onTasksChange?.(tasks);
  }, [tasks, onTasksChange]);

  const addTask = () => {
    if (newTask.designation && newTask.mechanic && newTask.estimatedHours) {
      const task: Task = {
        id: Date.now().toString(),
        designation: newTask.designation,
        mechanic: newTask.mechanic,
        estimatedHours: newTask.estimatedHours,
        hourlyRate: newTask.hourlyRate || defaultHourlyRate,
        price: (newTask.estimatedHours * (newTask.hourlyRate || defaultHourlyRate))
      };
      setTasks([...tasks, task]);
      setNewTask({
        designation: '',
        mechanic: '',
        estimatedHours: 0,
        hourlyRate: defaultHourlyRate,
        price: 0
      });
      setIsAddingNew(false);
    }
  };

  const removeTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const updateTask = (taskId: string, updatedTask: Task) => {
    setTasks(tasks.map(task => task.id === taskId ? updatedTask : task));
    setEditingTask(null);
  };

  const startEditTask = (task: Task) => {
    setEditingTask(task.id);
  };

  const cancelEditTask = () => {
    setEditingTask(null);
  };

  const getTotalPrice = () => {
    return tasks.reduce((total, task) => total + task.price, 0);
  };

  const getTotalHours = () => {
    return tasks.reduce((total, task) => total + task.estimatedHours, 0);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Wrench className="w-6 h-6" />
          Job Order Dashboard
        </h2>
        <button
          onClick={() => setIsAddingNew(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Add New Task Form */}
      {isAddingNew && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Designation</label>
              <select
                value={newTask.designation || ''}
                onChange={(e) => setNewTask({ ...newTask, designation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a task</option>
                {commonTasks.map(task => (
                  <option key={task} value={task}>{task}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mechanic</label>
              <select
                value={newTask.mechanic || ''}
                onChange={(e) => setNewTask({ ...newTask, mechanic: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select mechanic</option>
                {mechanics.map(mechanic => (
                  <option key={mechanic.id} value={mechanic.name}>
                    {mechanic.name} ({mechanic.availability})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="w-4 h-4 inline mr-1" />
                Estimated Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={newTask.estimatedHours || ''}
                onChange={(e) => setNewTask({ ...newTask, estimatedHours: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Hourly Rate
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newTask.hourlyRate || ''}
                onChange={(e) => setNewTask({ ...newTask, hourlyRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calculator className="w-4 h-4 inline mr-1" />
                Price
              </label>
              <input
                type="number"
                step="0.01"
                value={newTask.price || 0}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={addTask}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </div>
      )}

      {/* Tasks Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Task Designation</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Assigned Mechanic</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Estimated Hours</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Price per Task</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b border-gray-200 hover:bg-gray-50">
                {editingTask === task.id ? (
                  <>
                    <td className="px-4 py-3">
                      <select
                        value={task.designation}
                        onChange={(e) => updateTask(task.id, { ...task, designation: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        {commonTasks.map(taskOption => (
                          <option key={taskOption} value={taskOption}>{taskOption}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={task.mechanic}
                        onChange={(e) => updateTask(task.id, { ...task, mechanic: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        {mechanics.map(mechanic => (
                          <option key={mechanic.id} value={mechanic.name}>{mechanic.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={task.estimatedHours}
                        onChange={(e) => {
                          const hours = parseFloat(e.target.value) || 0;
                          const price = hours * task.hourlyRate;
                          updateTask(task.id, { ...task, estimatedHours: hours, price });
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        {formatCurrency(task.price)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={cancelEditTask}
                          className="text-gray-600 hover:text-gray-800 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-sm text-gray-900">{task.designation}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        {task.mechanic}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        {task.estimatedHours}h
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        {formatCurrency(task.price)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditTask(task)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeTask(task.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No tasks added yet. Click "Add Task" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {tasks.length > 0 && (
        <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex justify-between items-center">
            <div className="text-lg font-semibold text-blue-800">
              Total Order Summary
            </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Total Hours: {getTotalHours()}h</div>
                <div className="text-2xl font-bold text-blue-800">
                  Total: {formatCurrency(getTotalPrice())}
                </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
