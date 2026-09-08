import React, { useState, useEffect } from 'react'
import { useInventoryStore } from '../stores/inventoryStore'
import { InventoryFormData } from '../types/inventory'
import { X, Save, Package } from 'lucide-react'

interface InventoryFormProps {
  item?: any
  isOpen: boolean
  onClose: () => void
  onSave: (data: InventoryFormData) => void
}

export const InventoryForm: React.FC<InventoryFormProps> = ({ 
  item, 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const { suppliers } = useInventoryStore()
  
  const [formData, setFormData] = useState<InventoryFormData>({
    sku: '',
    name: '',
    description: '',
    category: 'other',
    quantity: 0,
    unit: 'piece',
    unitCost: 0,
    sellingPrice: 0,
    minimumStock: 0,
    maximumStock: 1000,
    reorderPoint: 0,
    location: '',
    supplierId: '',
    barcode: '',
    manufacturerWarrantyMonths: 0,
    taxRate: 0,
    isTaxable: true,
    isTrackable: true,
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (item) {
      setFormData({
        sku: item.sku || '',
        name: item.name || '',
        description: item.description || '',
        category: item.category || 'other',
        quantity: item.quantity || 0,
        unit: item.unit || 'piece',
        unitCost: item.unitCost || 0,
        sellingPrice: item.sellingPrice || 0,
        minimumStock: item.minimumStock || 0,
        maximumStock: item.maximumStock || 1000,
        reorderPoint: item.reorderPoint || 0,
        location: item.location || '',
        supplierId: item.supplierId || '',
        barcode: item.barcode || '',
        manufacturerWarrantyMonths: item.manufacturerWarrantyMonths || 0,
        taxRate: item.taxRate || 0,
        isTaxable: item.isTaxable || true,
        isTrackable: item.isTrackable || true,
        notes: item.notes || ''
      })
    } else {
      setFormData({
        sku: '',
        name: '',
        description: '',
        category: 'other',
        quantity: 0,
        unit: 'piece',
        unitCost: 0,
        sellingPrice: 0,
        minimumStock: 0,
        maximumStock: 1000,
        reorderPoint: 0,
        location: '',
        supplierId: '',
        barcode: '',
        manufacturerWarrantyMonths: 0,
        taxRate: 0,
        isTaxable: true,
        isTrackable: true,
        notes: ''
      })
    }
  }, [item, isOpen])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required'
    }

    if (formData.quantity < 0) {
      newErrors.quantity = 'Quantity cannot be negative'
    }

    if (formData.unitCost < 0) {
      newErrors.unitCost = 'Unit cost cannot be negative'
    }

    if (formData.sellingPrice < 0) {
      newErrors.sellingPrice = 'Selling price cannot be negative'
    }

    if (formData.minimumStock < 0) {
      newErrors.minimumStock = 'Minimum stock cannot be negative'
    }

    if (formData.maximumStock < formData.minimumStock) {
      newErrors.maximumStock = 'Maximum stock must be greater than minimum stock'
    }

    if (formData.reorderPoint < 0) {
      newErrors.reorderPoint = 'Reorder point cannot be negative'
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Storage location is required'
    }

    if (!formData.supplierId || !formData.supplierId.trim()) {
      newErrors.supplierId = 'Supplier is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSave(formData)
    }
  }

  const handleInputChange = (field: keyof InventoryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const categories = [
    { value: 'engine_parts', label: 'Engine Parts' },
    { value: 'brakes', label: 'Brakes' },
    { value: 'suspension', label: 'Suspension' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'body_parts', label: 'Body Parts' },
    { value: 'fluids', label: 'Fluids' },
    { value: 'tools', label: 'Tools' },
    { value: 'other', label: 'Other' }
  ]

  const units = [
    { value: 'piece', label: 'Piece' },
    { value: 'liter', label: 'Liter' },
    { value: 'kg', label: 'Kilogram' },
    { value: 'meter', label: 'Meter' },
    { value: 'set', label: 'Set' },
    { value: 'box', label: 'Box' }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold leading-6 text-gray-900 flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  {item ? 'Edit Inventory Item' : 'Add Inventory Item'}
                </h3>
                <button
                  onClick={onClose}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Basic Information */}
                  <div className="lg:col-span-3">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Basic Information</h4>
                  </div>

                  <div>
                    <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
                      SKU *
                    </label>
                    <input
                      type="text"
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        errors.sku ? 'border-red-300' : ''
                      }`}
                      placeholder="Enter SKU"
                    />
                    {errors.sku && <p className="mt-1 text-sm text-red-600">{errors.sku}</p>}
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        errors.name ? 'border-red-300' : ''
                      }`}
                      placeholder="Enter item name"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">
                      Barcode
                    </label>
                    <input
                      type="text"
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) => handleInputChange('barcode', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter barcode"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter description"
                    />
                  </div>

                  {/* Stock Information */}
                  <div className="lg:col-span-3 pt-4">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Stock Information</h4>
                  </div>

                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                      Current Quantity *
                    </label>
                    <input
                      type="number"
                      id="quantity"
                      min="0"
                      step="1"
                      value={formData.quantity}
                      onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        errors.quantity ? 'border-red-300' : ''
                      }`}
                    />
                    {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
                  </div>

                  <div>
                    <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                      Unit *
                    </label>
                    <select
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => handleInputChange('unit', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      {units.map(unit => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                      Storage Location *
                    </label>
                    <input
                      type="text"
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        errors.location ? 'border-red-300' : ''
                      }`}
                      placeholder="e.g., Warehouse A, Shelf 1"
                    />
                    {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
                  </div>

                  {/* Pricing */}
                  <div className="lg:col-span-3 pt-4">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Pricing</h4>
                  </div>

                  <div>
                    <label htmlFor="unitCost" className="block text-sm font-medium text-gray-700">
                      Unit Cost ($) *
                    </label>
                    <input
                      type="number"
                      id="unitCost"
                      min="0"
                      step="0.01"
                      value={formData.unitCost}
                      onChange={(e) => handleInputChange('unitCost', parseFloat(e.target.value) || 0)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        errors.unitCost ? 'border-red-300' : ''
                      }`}
                    />
                    {errors.unitCost && <p className="mt-1 text-sm text-red-600">{errors.unitCost}</p>}
                  </div>

                  <div>
                    <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700">
                      Selling Price ($) *
                    </label>
                    <input
                      type="number"
                      id="sellingPrice"
                      min="0"
                      step="0.01"
                      value={formData.sellingPrice}
                      onChange={(e) => handleInputChange('sellingPrice', parseFloat(e.target.value) || 0)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        errors.sellingPrice ? 'border-red-300' : ''
                      }`}
                    />
                    {errors.sellingPrice && <p className="mt-1 text-sm text-red-600">{errors.sellingPrice}</p>}
                  </div>

                  <div>
                    <label htmlFor="warrantyPeriod" className="block text-sm font-medium text-gray-700">
                      Warranty Period (months)
                    </label>
                    <input
                      type="number"
                      id="warrantyPeriod"
                      min="0"
                      step="1"
                      value={formData.manufacturerWarrantyMonths}
                      onChange={(e) => handleInputChange('manufacturerWarrantyMonths', parseInt(e.target.value) || 0)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  {/* Stock Thresholds */}
                  <div className="lg:col-span-3 pt-4">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Stock Thresholds</h4>
                  </div>

                  <div>
                    <label htmlFor="minimumStock" className="block text-sm font-medium text-gray-700">
                      Minimum Stock *
                    </label>
                    <input
                      type="number"
                      id="minimumStock"
                      min="0"
                      step="1"
                      value={formData.minimumStock}
                      onChange={(e) => handleInputChange('minimumStock', parseInt(e.target.value) || 0)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        errors.minimumStock ? 'border-red-300' : ''
                      }`}
                    />
                    {errors.minimumStock && <p className="mt-1 text-sm text-red-600">{errors.minimumStock}</p>}
                  </div>

                  <div>
                    <label htmlFor="maximumStock" className="block text-sm font-medium text-gray-700">
                      Maximum Stock *
                    </label>
                    <input
                      type="number"
                      id="maximumStock"
                      min="0"
                      step="1"
                      value={formData.maximumStock}
                      onChange={(e) => handleInputChange('maximumStock', parseInt(e.target.value) || 0)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        errors.maximumStock ? 'border-red-300' : ''
                      }`}
                    />
                    {errors.maximumStock && <p className="mt-1 text-sm text-red-600">{errors.maximumStock}</p>}
                  </div>

                  <div>
                    <label htmlFor="reorderPoint" className="block text-sm font-medium text-gray-700">
                      Reorder Point *
                    </label>
                    <input
                      type="number"
                      id="reorderPoint"
                      min="0"
                      step="1"
                      value={formData.reorderPoint}
                      onChange={(e) => handleInputChange('reorderPoint', parseInt(e.target.value) || 0)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        errors.reorderPoint ? 'border-red-300' : ''
                      }`}
                    />
                    {errors.reorderPoint && <p className="mt-1 text-sm text-red-600">{errors.reorderPoint}</p>}
                  </div>

                  {/* Category and Supplier */}
                  <div className="lg:col-span-3 pt-4">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Category and Supplier</h4>
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      {categories.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700">
                      Supplier *
                    </label>
                    <select
                      id="supplierId"
                      value={formData.supplierId}
                      onChange={(e) => handleInputChange('supplierId', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    {errors.supplierId && (
                      <p className="mt-1 text-sm text-red-600">{errors.supplierId}</p>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="lg:col-span-3">
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {item ? 'Update Item' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
