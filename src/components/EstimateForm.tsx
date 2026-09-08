import { useState, useEffect, useRef } from 'react'
import { t } from '../i18n'
import { formatCurrency } from '../utils/formatters'
import { useNavigate, useParams } from 'react-router-dom'
import { useCustomerStore } from '../stores/customerStore'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { useMechanicStore } from '../stores/mechanicStore'
import { useWorkshopSettings } from '../stores/settingsStore'
import { EstimateFormData, EstimateItem } from '../types/estimate'
import { Customer } from '../types/customer'
import { JobPart, LaborItem } from '../types/jobOrder'
import { renderDocument, convertWorkshopSettings } from '../utils/renderDocument'
import LaborSection from './LaborSection'
import PartsSection from './PartsSection'
import { 
  ArrowLeft, 
  Save, 
  Calendar, 
  User, 
  Printer,
  FileText
} from 'lucide-react'

// Extended form data to handle separate parts and labor before combining
interface ExtendedEstimateFormData extends Omit<EstimateFormData, 'items'> {
  parts: JobPart[]
  laborItems: LaborItem[]
}

const EstimateForm = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { customers } = useCustomerStore()
  const { createEstimate, updateEstimate, getEstimateById, estimates } = useEstimateInvoiceStore()
  const { mechanics, fetchMechanics } = useMechanicStore()
  const workshop = useWorkshopSettings()
  
  const isEditMode = !!id
  
  // Debug logging
  console.log('EstimateForm mounting', { isEditMode, id, estimatesCount: estimates.length })
  
  const [formData, setFormData] = useState<ExtendedEstimateFormData>({
    customerId: '',
    vehicleId: '',
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days default
    notes: '',
    termsAndConditions: t('estimateForm.defaults.terms'),
    parts: [],
    laborItems: []
  })

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof ExtendedEstimateFormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isLoaded = useRef(false)

  // Mock available parts - ideally this should come from inventory store or API
  const availableParts = [
    { id: 'part_001', name: 'Engine Oil Filter', partNumber: 'OF-1234', unitCost: 15.99, description: 'Standard oil filter', supplier: 'AutoParts Co' },
    { id: 'part_002', name: 'Brake Pads Set', partNumber: 'BP-5678', unitCost: 89.99, description: 'Ceramic brake pads', supplier: 'BrakeTech' },
    { id: 'part_003', name: 'Air Filter', partNumber: 'AF-9012', unitCost: 24.99, description: 'Engine air filter', supplier: 'FilterPro' },
    { id: 'part_004', name: 'Spark Plug Set', partNumber: 'SP-3456', unitCost: 45.99, description: 'Set of 4 spark plugs', supplier: 'SparkMaster' },
    { id: 'part_005', name: 'Battery', partNumber: 'BT-7890', unitCost: 129.99, description: '12V car battery', supplier: 'PowerCell' }
  ]

  useEffect(() => {
    fetchMechanics()
    const interval = setInterval(() => {
      fetchMechanics()
    }, 60000)
    return () => clearInterval(interval)
  }, [fetchMechanics])

  useEffect(() => {
    if (isEditMode && id && !isLoaded.current) {
      const existingEstimate = getEstimateById(id)
      if (existingEstimate) {
        // Separate items into parts and labor
        const parts: JobPart[] = (existingEstimate.items || [])
          .filter(i => i.type === 'part' || i.type === 'other')
          .map(i => ({
            id: i.id,
            category: i.category,
            discountRate: i.discountRate,
            name: i.description,
            partNumber: i.partNumber || '',
            description: i.notes || '',
            quantity: i.quantity,
            unitCost: i.unitPrice,
            totalCost: i.totalPrice,
            supplier: '',
            status: 'ordered',
            orderedDate: existingEstimate.issueDate
          }))

        const laborItems: LaborItem[] = (existingEstimate.items || [])
          .filter(i => i.type === 'labor' || i.type === 'service')
          .map(i => ({
            id: i.id,
            category: i.category,
            discountRate: i.discountRate,
            description: i.description,
            notes: i.notes,
            hours: i.quantity,
            rate: i.unitPrice,
            total: i.totalPrice,
            mechanic: '', // Information lost in conversion if not stored in notes/meta
            date: existingEstimate.issueDate
          }))

        setFormData({
          customerId: existingEstimate.customerId,
          vehicleId: existingEstimate.vehicleId,
          issueDate: existingEstimate.issueDate,
          expiryDate: existingEstimate.expiryDate,
          notes: existingEstimate.notes,
          termsAndConditions: existingEstimate.termsAndConditions,
          parts,
          laborItems
        })

        const customer = customers.find(c => c.id === existingEstimate.customerId)
        setSelectedCustomer(customer || null)
        isLoaded.current = true
      }
    }
  }, [isEditMode, id, getEstimateById, customers, estimates])

  // Helper to safely get customer address
  const getCustomerAddress = (customer: Customer | null) => {
    if (!customer) return { street: '', zipCode: '', city: '' }
    
    // Handle case where address might be a string (legacy data)
    const addr = (customer as any).address
    if (typeof addr === 'string') {
      return { street: addr, zipCode: '', city: '' }
    }
    
    // Handle case where address is an object
    if (addr && typeof addr === 'object') {
      return {
        street: addr.street || '',
        zipCode: addr.zipCode || '',
        city: addr.city || ''
      }
    }

    // Fallback
    return { street: '', zipCode: '', city: '' }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ExtendedEstimateFormData, string>> = {}
    
    if (!formData.customerId) newErrors.customerId = t('estimateForm.errors.customerRequired')
    if (!formData.vehicleId) newErrors.vehicleId = t('estimateForm.errors.vehicleRequired')
    if (!formData.issueDate) newErrors.issueDate = t('estimateForm.errors.issueDateRequired')
    if (!formData.expiryDate) newErrors.expiryDate = t('estimateForm.errors.expiryDateRequired')
    
    // Validate dates
    if (formData.issueDate && formData.expiryDate) {
      const issueDate = new Date(formData.issueDate)
      const expiryDate = new Date(formData.expiryDate)
      if (expiryDate <= issueDate) {
        newErrors.expiryDate = t('estimateForm.errors.expiryDateAfterIssue')
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    if (!selectedCustomer) return

    setIsSubmitting(true)

    try {
      // Convert Parts and Labor back to EstimateItems
      const items: EstimateItem[] = [
        ...formData.parts.map(p => ({
          id: p.id,
          type: 'part' as const,
          category: p.category,
          discountRate: p.discountRate,
          description: p.name, // or combine name + desc
          notes: p.description,
          quantity: p.quantity,
          unitPrice: p.unitCost,
          totalPrice: p.totalCost,
          partNumber: p.partNumber,
          taxRate: 0.2 // Default VAT
        })),
        ...formData.laborItems.map(l => ({
          id: l.id,
          type: 'labor' as const,
          category: l.category,
          discountRate: l.discountRate,
          description: l.description,
          notes: l.notes,
          quantity: l.hours,
          unitPrice: l.rate,
          totalPrice: l.total,
          taxRate: 0.2 // Default VAT
        }))
      ]

      const estimateData: EstimateFormData = {
        customerId: formData.customerId,
        vehicleId: formData.vehicleId,
        issueDate: formData.issueDate,
        expiryDate: formData.expiryDate,
        items,
        notes: formData.notes,
        termsAndConditions: formData.termsAndConditions
      }

      if (isEditMode && id) {
        updateEstimate(id, estimateData)
      } else {
        const selectedVehicle = selectedCustomer.vehicles.find(v => v.id === formData.vehicleId)
        if (selectedVehicle) {
          createEstimate(estimateData, selectedCustomer, selectedVehicle)
        }
      }
      navigate('/estimates')
    } catch (error) {
      console.error('Error saving estimate:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrint = () => {
    if (!selectedCustomer) {
      alert(t('estimateForm.errors.customerRequired'))
      return
    }

    const selectedVehicle = selectedCustomer.vehicles.find(v => v.id === formData.vehicleId)
    
    // Calculate totals locally for preview
    const partsTotal = formData.parts.reduce((sum, p) => sum + p.totalCost, 0)
    const laborTotal = formData.laborItems.reduce((sum, l) => sum + l.total, 0)
    const subtotal = partsTotal + laborTotal
    const vatAmount = subtotal * 0.20 // 20% VAT
    const totalAmount = subtotal + vatAmount

    const docData = {
      number: 'DV-PREVIEW',
      date: formData.issueDate,
      dueDate: formData.expiryDate,
      validUntil: formData.expiryDate,
      status: 'draft',
      terms: formData.termsAndConditions,
      lines: formData.parts.map((item, index) => ({
        type: 'part',
        category: item.category,
        ref: item.partNumber || `P${String(index + 1).padStart(3, '0')}`,
        description: item.name,
        shortDescription: item.description,
        quantity: item.quantity,
        unitPrice: item.unitCost,
        discount: 0,
        lineTotal: item.totalCost,
        tvaRate: 20
      })),
      labor: formData.laborItems.map(item => ({
        category: item.category,
        description: item.description,
        shortDescription: item.notes,
        hours: item.hours,
        hourlyRate: item.rate,
        totalAmount: item.total
      })),
      subtotal,
      partsSubtotal: partsTotal,
      laborSubtotal: laborTotal,
      vatTotal: vatAmount,
      grandTotal: totalAmount,
      notes: formData.notes
    }

    try {
      const addressInfo = getCustomerAddress(selectedCustomer)
      const html = renderDocument(
        'devis',
        convertWorkshopSettings(workshop || {}),
        docData,
        {
          name: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
          address: addressInfo.street,
          postalCode: addressInfo.zipCode,
          city: addressInfo.city,
          phone: selectedCustomer.phone,
          email: selectedCustomer.email
        },
        selectedVehicle
      )

      if (!html || html.trim().length === 0) {
        throw new Error('Generated HTML is empty')
      }

      console.log('Generated HTML length:', html.length);
      
      // Use iframe for printing
      const iframe = document.createElement('iframe')
      // Set style to be invisible but technically rendered
      iframe.style.visibility = 'hidden'
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '1px'
      iframe.style.height = '1px'
      iframe.style.border = '0'
      document.body.appendChild(iframe)
      
      const doPrint = () => {
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
        } catch (e) {
          console.error('Print failed:', e)
          alert('Printing failed. Please try again.')
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe)
            }
          }, 5000)
        }
      }

      const frameDoc = iframe.contentWindow?.document
      if (frameDoc) {
        frameDoc.open()
        frameDoc.write(html)
        frameDoc.close()
        
        setTimeout(doPrint, 1000)
      } else {
        alert('Printing failed: Browser security restriction.')
      }
    } catch (error) {
      console.error('Error generating document:', error)
      alert('Error generating document preview.')
    }
  }

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId)
    setSelectedCustomer(customer || null)
    setFormData(prev => ({
      ...prev,
      customerId,
      vehicleId: ''
    }))
  }

  const handleInputChange = (field: keyof ExtendedEstimateFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/estimates')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? t('estimateForm.header.edit') : t('estimateForm.header.create')}
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{t('estimateForm.actions.print')}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Vehicle Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            {t('estimateForm.sections.customerVehicle')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('estimateForm.labels.customer')}
              </label>
              <select
                value={formData.customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.customerId ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">{t('estimateForm.select.selectCustomer')}</option>
                {(customers || []).map((customer) => (
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
                {t('estimateForm.labels.vehicle')}
              </label>
              <select
                value={formData.vehicleId}
                onChange={(e) => handleInputChange('vehicleId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.vehicleId ? 'border-red-500' : 'border-gray-300'
                }`}
                required
                disabled={!selectedCustomer}
              >
                <option value="">{t('estimateForm.select.selectVehicle')}</option>
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

        {/* Estimate Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            {t('estimateForm.sections.details')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('estimateForm.labels.issueDate')}
              </label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => handleInputChange('issueDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.issueDate ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.issueDate && (
                <p className="text-red-500 text-sm mt-1">{errors.issueDate}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('estimateForm.labels.expiryDate')}
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.expiryDate ? 'border-red-500' : 'border-gray-300'
                }`}
                required
                min={formData.issueDate}
              />
              {errors.expiryDate && (
                <p className="text-red-500 text-sm mt-1">{errors.expiryDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Labor and Parts Sections */}
        <div className="space-y-6">
          <LaborSection 
            laborItems={formData.laborItems}
            onLaborChange={(items) => handleInputChange('laborItems', items)}
            mechanics={(mechanics || []).filter(m => m.status === 'active')}
          />
          
          <PartsSection 
            parts={formData.parts}
            onPartsChange={(parts) => handleInputChange('parts', parts)}
            availableParts={availableParts}
          />

          {/* Overall Total */}
          {(formData.laborItems.length > 0 || formData.parts.length > 0) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div className="text-lg font-semibold text-gray-900">
                  {t('estimateForm.summary.total')}
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                    (formData.laborItems.reduce((total, item) => total + item.total, 0)) +
                    (formData.parts.reduce((total, part) => total + part.totalCost, 0))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            {t('estimateForm.sections.additional')}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('estimateForm.labels.notes')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder={t('estimateForm.additional.placeholders.notes')}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('estimateForm.labels.terms')}
              </label>
              <textarea
                value={formData.termsAndConditions}
                onChange={(e) => handleInputChange('termsAndConditions', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder={t('estimateForm.additional.placeholders.terms')}
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/estimates')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('estimateForm.actions.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? t('estimateForm.actions.saving') : t('estimateForm.actions.save')}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default EstimateForm
