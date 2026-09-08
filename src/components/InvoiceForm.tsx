import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useCustomerStore } from '../stores/customerStore'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { t } from '../i18n'
import { useDeliveryNoteStore } from '../stores/deliveryNoteStore'
import { InvoiceFormData, InvoiceItem } from '../types/estimate'
import { Customer } from '../types/customer'
import {
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Calculator,
  Calendar,
  User,
  FileText,
  Printer,
  Download,
  CheckCircle,
  DollarSign
} from 'lucide-react'
import { exportInvoiceToPDF } from '../utils/exportUtils'
import type { Invoice } from '../types/estimate'

const categorySuggestions = [
  'Moteur',
  'Injection',
  'Allumage',
  'Distribution',
  'Refroidissement',
  'Lubrification',
  'Freinage',
  'Suspension',
  'Direction',
  'Transmission',
  'Embrayage',
  'Échappement',
  'Climatisation',
  'Électricité',
  'Batterie / Démarrage',
  'Pneumatiques',
  'Carrosserie',
  'Entretien / Vidange',
  'Diagnostic',
  'Divers'
]

const InvoiceForm = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const { customers } = useCustomerStore()
  const { 
    createInvoice, 
    updateInvoice,
    invoices,
    convertEstimateToInvoice, 
    calculateInvoiceTotals,
    selectedEstimate,
    createInvoiceFromDeliveryNotes
  } = useEstimateInvoiceStore()
  const { deliveryNotes } = useDeliveryNoteStore()
  
  // Check if we're converting from an estimate
  const estimateId = location.state?.estimateId
  const isFromEstimate = !!estimateId
  const isEditing = !!id
  
  const [formData, setFormData] = useState<InvoiceFormData>({
    estimateId: estimateId || undefined,
    customerId: '',
    vehicleId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    items: [],
    notes: '',
    termsAndConditions: 'Payment due within 30 days. All work subject to our standard terms and conditions.'
  })
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedBLIds, setSelectedBLIds] = useState<Set<string>>(new Set())
  
  // Calculate totals
  const totals = calculateInvoiceTotals(formData.items)

  const handlePreviewPrint = () => {
    if (!selectedCustomer) { window.print(); return }
    const vehicle = selectedCustomer.vehicles.find(v => v.id === formData.vehicleId)
    const invoice: Invoice = {
      id: 'preview',
      invoiceNumber: 'INV-PREVIEW',
      estimateId: formData.estimateId,
      customerId: formData.customerId,
      customerName: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
      vehicleId: formData.vehicleId,
      vehicleInfo: {
        make: vehicle?.make || '',
        model: vehicle?.model || '',
        year: vehicle?.year || new Date().getFullYear(),
        vin: (vehicle as any)?.vin || '',
        registration: vehicle?.registration || ''
      },
      issueDate: new Date(formData.issueDate).toISOString(),
      dueDate: new Date(formData.dueDate).toISOString(),
      status: 'sent',
      items: formData.items.map(i => ({
        id: i.id,
        type: i.type as any,
        category: i.category,
        discountRate: i.discountRate,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        taxRate: 0.2,
        partNumber: i.partNumber
      })),
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      totalAmount: totals.totalAmount,
      paidAmount: 0,
      remainingAmount: totals.totalAmount,
      paymentStatus: 'unpaid',
      amountPaid: 0,
      notes: formData.notes,
      termsAndConditions: formData.termsAndConditions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'System'
    }
    exportInvoiceToPDF(invoice)
  }
  
  useEffect(() => {
    // If editing, load invoice data
    if (isEditing && id) {
      const invoice = invoices.find(i => i.id === id)
      if (invoice) {
        const customer = customers.find(c => c.id === invoice.customerId)
        if (customer) {
            setSelectedCustomer(customer)
            setFormData({
                estimateId: invoice.estimateId,
                customerId: invoice.customerId,
                vehicleId: invoice.vehicleId,
                issueDate: invoice.issueDate,
                dueDate: invoice.dueDate,
                items: invoice.items.map(item => ({ ...item })),
                notes: invoice.notes || '',
                termsAndConditions: invoice.termsAndConditions || ''
            })
        }
      } else {
          // Invoice not found
          navigate('/invoices')
      }
    }
    // If converting from estimate, populate data
    else if (isFromEstimate && selectedEstimate) {
      const customer = customers.find(c => c.id === selectedEstimate.customerId)
      if (customer) {
        setSelectedCustomer(customer)
        setFormData(prev => ({
          ...prev,
          customerId: selectedEstimate.customerId,
          vehicleId: selectedEstimate.vehicleId,
          items: selectedEstimate.items.map(item => ({ ...item })), // Deep copy
          notes: selectedEstimate.notes,
          termsAndConditions: selectedEstimate.termsAndConditions || prev.termsAndConditions
        }))
      }
    }
  }, [isEditing, id, invoices, isFromEstimate, selectedEstimate, customers, navigate])
  
  useEffect(() => {
    // Set minimum dates
    const today = new Date().toISOString().split('T')[0]
    if (formData.issueDate < today) {
      setFormData(prev => ({ ...prev, issueDate: today }))
    }
  }, [])
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.customerId) newErrors.customerId = 'Customer is required'
    if (!formData.vehicleId) newErrors.vehicleId = 'Vehicle is required'
    if (!formData.issueDate) newErrors.issueDate = 'Issue date is required'
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required'
    if (formData.items.length === 0) newErrors.items = 'At least one item is required'
    
    // Validate dates
    if (formData.issueDate && formData.dueDate) {
      const issueDate = new Date(formData.issueDate)
      const dueDate = new Date(formData.dueDate)
      if (dueDate <= issueDate) {
        newErrors.dueDate = 'Due date must be after issue date'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // If BLs selected, create invoice from delivery notes
    if (selectedBLIds.size > 0) {
      setIsSubmitting(true)
      try {
        const ids = Array.from(selectedBLIds)
        createInvoiceFromDeliveryNotes(ids)
        navigate('/invoices')
      } catch (error) {
        console.error('Error creating invoice from BLs:', error)
        alert('Failed to create invoice from delivery notes.')
      } finally {
        setIsSubmitting(false)
      }
      return
    }
    if (!validateForm() || !selectedCustomer) return
    
    setIsSubmitting(true)
    try {
      const selectedVehicle = selectedCustomer.vehicles.find(v => v.id === formData.vehicleId)
      if (selectedVehicle) {
        if (isEditing && id) {
            updateInvoice(id, {
                customerId: formData.customerId,
                customerName: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
                vehicleId: formData.vehicleId,
                vehicleInfo: {
                    make: selectedVehicle.make,
                    model: selectedVehicle.model,
                    year: selectedVehicle.year,
                    vin: selectedVehicle.vin,
                    registration: selectedVehicle.registration
                },
                issueDate: formData.issueDate,
                dueDate: formData.dueDate,
                items: formData.items,
                notes: formData.notes,
                termsAndConditions: formData.termsAndConditions
            })
        } else if (isFromEstimate) {
          convertEstimateToInvoice(estimateId)
        } else {
          createInvoice(formData, selectedCustomer, selectedVehicle)
        }
        navigate('/invoices')
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      alert('Failed to create invoice. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleInputChange = (field: keyof InvoiceFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }
  
  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId)
    setSelectedCustomer(customer || null)
    setFormData(prev => ({
      ...prev,
      customerId,
      vehicleId: '' // Reset vehicle selection when customer changes
    }))
  }
  
  const addItem = () => {
    const newItem: InvoiceItem = {
      id: `item_${Date.now()}`,
      type: 'service',
      category: '',
      discountRate: 0,
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      taxRate: 20 // 20% VAT
    }
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }
  
  const updateItem = (itemId: string, field: keyof InvoiceItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value }
          // Recalculate total price
          if (field === 'quantity' || field === 'unitPrice' || field === 'discountRate') {
            const r = Math.min(100, Math.max(0, Number(updatedItem.discountRate ?? 0)))
            updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice * (1 - r / 100)
          }
          return updatedItem
        }
        return item
      })
    }))
  }
  
  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }))
  }
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/invoices')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Edit Invoice' : (isFromEstimate ? t('invoiceForm.header.convert') : t('invoiceForm.header.create'))}
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePreviewPrint}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            aria-label={t('invoiceForm.actions.print')}
          >
            <Printer className="w-4 h-4" />
            <span>{t('invoiceForm.actions.print')}</span>
          </button>
          <button
            onClick={() => {/* TODO: Implement export */}}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            aria-label={t('invoiceForm.actions.export')}
          >
            <Download className="w-4 h-4" />
            <span>{t('invoiceForm.actions.export')}</span>
          </button>
        </div>
      </div>
      
      {/* Conversion Info Banner */}
      {isFromEstimate && selectedEstimate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
            <p className="text-blue-800">
              Converting estimate <strong>{selectedEstimate.estimateNumber}</strong> to invoice.
              Total amount: <strong>${selectedEstimate.totalAmount.toFixed(2)}</strong>
            </p>
          </div>
        </div>
      )}
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <datalist id="invoice-category-suggestions">
          {categorySuggestions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {/* Customer & Vehicle Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            {t('invoiceForm.sections.customerVehicle')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('invoiceForm.labels.customer')}
              </label>
              <select
                value={formData.customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.customerId ? 'border-red-500' : 'border-gray-300'
                }`}
                required
                disabled={isFromEstimate}
              >
                <option value="">{t('invoiceForm.select.selectCustomer')}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.firstName} {customer.lastName} - {customer.email}
                  </option>
                ))}
              </select>
              {errors.customerId && (
                <p className="text-red-500 text-sm mt-1">{errors.customerId}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('invoiceForm.labels.vehicle')}
              </label>
              <select
                value={formData.vehicleId}
                onChange={(e) => handleInputChange('vehicleId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.vehicleId ? 'border-red-500' : 'border-gray-300'
                }`}
                required
                disabled={!selectedCustomer || isFromEstimate}
              >
                <option value="">{t('invoiceForm.select.selectVehicle')}</option>
                {selectedCustomer?.vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} ({vehicle.year}) - {vehicle.registration}
                  </option>
                ))}
              </select>
              {errors.vehicleId && (
                <p className="text-red-500 text-sm mt-1">{errors.vehicleId}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Invoice Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            {t('invoiceForm.sections.details')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('invoiceForm.labels.issueDate')}
              </label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => handleInputChange('issueDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.issueDate ? 'border-red-500' : 'border-gray-300'
                }`}
                required
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.issueDate && (
                <p className="text-red-500 text-sm mt-1">{errors.issueDate}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('invoiceForm.labels.dueDate')}
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.dueDate ? 'border-red-500' : 'border-gray-300'
                }`}
                required
                min={formData.issueDate}
              />
              {errors.dueDate && (
                <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Link Delivery Notes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            {t('invoiceForm.sections.linkBL')}
          </h2>
          <p className="text-sm text-gray-600 mb-4">{t('invoiceForm.linkBL.help')}</p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoiceForm.linkBL.table.select')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoiceForm.linkBL.table.blNumber')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoiceForm.linkBL.table.customer')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoiceForm.linkBL.table.date')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoiceForm.linkBL.table.amount')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoiceForm.linkBL.table.status')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deliveryNotes
                    .filter(n => !n.relatedInvoiceId && n.status !== 'invoiced')
                    .filter(n => !selectedCustomer || n.customerId === selectedCustomer.id)
                    .map(n => (
                      <tr key={n.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            aria-label={`Select ${n.blNumber}`}
                            checked={selectedBLIds.has(n.id)}
                            onChange={(e) => {
                              setSelectedBLIds(prev => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(n.id); else next.delete(n.id)
                                return next
                              })
                            }}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900">{n.blNumber}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{n.customerName}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{new Date(n.issueDate).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">${n.totalValue.toFixed(2)}</td>
                        <td className="px-3 py-2 text-xs">
                          <span className={`px-2 py-1 rounded-full bg-gray-100 text-gray-800`}>{n.status}</span>
                        </td>
                      </tr>
                    ))}
                  {deliveryNotes.filter(n => !n.relatedInvoiceId && n.status !== 'invoiced').length === 0 && (
                    <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500 text-sm">{t('invoiceForm.linkBL.none')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {selectedBLIds.size > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                {t('invoiceForm.linkBL.actionCreate')}
              </button>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Calculator className="w-5 h-5 mr-2" />
              {t('invoiceForm.sections.itemsPricing')}
            </h2>
            <button
              type="button"
              onClick={addItem}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('invoiceForm.items.addItem')}</span>
            </button>
          </div>
          
          {formData.items.length === 0 ? (
            <div className="text-center py-8">
              <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">{t('invoiceForm.items.emptyText')}</p>
              <button
                type="button"
                onClick={addItem}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{t('invoiceForm.items.addFirst')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.items.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('invoiceForm.items.fields.type')}
                      </label>
                      <select
                        value={item.type}
                        onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="service">{t('invoiceForm.items.fields.typeOptions.service')}</option>
                        <option value="part">{t('invoiceForm.items.fields.typeOptions.part')}</option>
                        <option value="labor">{t('invoiceForm.items.fields.typeOptions.labor')}</option>
                        <option value="other">{t('invoiceForm.items.fields.typeOptions.other')}</option>
                      </select>
                    </div>
                    
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('invoiceForm.items.fields.description')}
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('invoiceForm.items.fields.descriptionPlaceholder')}
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('invoiceForm.items.fields.category')}
                    </label>
                    <input
                      list="invoice-category-suggestions"
                      type="text"
                      value={item.category || ''}
                      onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('invoiceForm.items.fields.categoryPlaceholder')}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('invoiceForm.items.fields.quantity')}
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('invoiceForm.items.fields.unitPrice')}
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('invoiceForm.items.fields.discount')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={Number(item.discountRate ?? 0)}
                        onChange={(e) => updateItem(item.id, 'discountRate', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('invoiceForm.items.fields.total')}
                      </label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-medium">
                        ${item.totalPrice.toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {item.type === 'part' && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('invoiceForm.items.fields.partNumber')}
                      </label>
                      <input
                        type="text"
                        value={item.partNumber || ''}
                        onChange={(e) => updateItem(item.id, 'partNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('invoiceForm.items.fields.partNumberPlaceholder')}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {errors.items && (
            <p className="text-red-500 text-sm mt-2">{errors.items}</p>
          )}
        </div>
        
        {/* Totals */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            {t('invoiceForm.sections.summary')}
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">{t('invoiceForm.summary.subtotal')}</span>
              <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">{t('invoiceForm.summary.vat')}</span>
              <span className="font-medium">${totals.vatAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-lg">
              <span className="font-semibold text-gray-900">{t('invoiceForm.summary.total')}</span>
              <span className="font-bold text-gray-900">${totals.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            {t('invoiceForm.sections.additional')}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('invoiceForm.labels.notes')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder={t('invoiceForm.additional.notesPlaceholder')}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('invoiceForm.labels.terms')}
              </label>
              <textarea
                value={formData.termsAndConditions}
                onChange={(e) => handleInputChange('termsAndConditions', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder={t('invoiceForm.additional.termsPlaceholder')}
              />
            </div>
          </div>
        </div>
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('invoiceForm.actions.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? t('invoiceForm.actions.creating') : (isEditing ? 'Update Invoice' : t('invoiceForm.actions.create'))}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default InvoiceForm
