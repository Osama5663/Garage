
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { useCustomerStore } from '../stores/customerStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useDeliveryNoteStore } from '../stores/deliveryNoteStore'
import { InvoiceItem } from '../types/estimate'
import { Plus, Trash2, Printer, Save, ArrowLeft, AlertCircle, FileText, Loader2 } from 'lucide-react'
import { renderDocument, convertWorkshopSettings } from '../utils/renderDocument'
import { formatCurrency } from '../utils/formatters'
import { printHtml } from '../utils/printHelpers'
import { toast } from 'sonner'

export const SNTLInvoicePage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { createInvoice, updateInvoice, invoices } = useEstimateInvoiceStore()
  const { customers } = useCustomerStore()
  const { workshop } = useSettingsStore()
  const { deliveryNotes } = useDeliveryNoteStore()

  // SNTL Specific State
  const [loading, setLoading] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [selectedBlId, setSelectedBlId] = useState('')
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerAddress: '',
    customerIce: '',
    customerPhone: '',
    customerCode: '',
    
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    period: '',
    contractRef: '',
    blNumber: '',
    
    // Transport Details
    vehicleMake: '',
    vehicleModel: '',
    vehiclePlate: '',
    origin: '',
    destination: '',
    merchandise: '',
    letterNumber: '',
    
    legalText: 'Arrêté la présente facture à la somme de...',
    
    items: [] as InvoiceItem[]
  })

  // Load existing invoice if editing
  useEffect(() => {
    if (id) {
      const existing = invoices.find(i => i.id === id)
      if (existing) {
        setFormData({
          customerId: existing.customerId,
          customerName: existing.customerName,
          customerAddress: existing.customData?.customerAddress || '',
          customerIce: existing.customData?.customerIce || '',
          customerPhone: existing.customData?.customerPhone || '',
          customerCode: existing.customData?.customerCode || '',
          
          invoiceNumber: existing.invoiceNumber,
          invoiceDate: existing.issueDate,
          period: existing.customData?.period || '',
          contractRef: existing.customData?.contractRef || '',
          blNumber: existing.customData?.blNumber || '',
          
          vehicleMake: existing.vehicleInfo?.make || '',
          vehicleModel: existing.vehicleInfo?.model || '',
          vehiclePlate: existing.vehicleInfo?.registration || '',
          origin: existing.customData?.origin || '',
          destination: existing.customData?.destination || '',
          merchandise: existing.customData?.merchandise || '',
          letterNumber: existing.customData?.letterNumber || '',
          
          legalText: existing.customData?.legalText || '',
          items: existing.items
        } as any)
      }
    } else {
        // Auto-generate invoice number if new (simplified logic)
        const nextNum = invoices.length + 1
        setFormData(prev => ({
            ...prev, 
            invoiceNumber: `SNTL-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`
        }))
    }
  }, [id, invoices])

  // Handle Client Selection
  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value
    const customer = customers.find(c => c.id === customerId)
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerAddress: customer.address ? `${customer.address.street}, ${customer.address.city}` : '',
        customerPhone: customer.phone,
        customerIce: '', // ICE usually not in standard customer store, user must fill
        customerCode: `CL-${customer.id.substring(0, 4).toUpperCase()}`
      }))
    }
  }

  // Handle BL Selection
  const handleBlSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const blId = e.target.value
    setSelectedBlId(blId)
    if (!blId) return

    const bl = deliveryNotes.find(n => n.id === blId)
    if (bl) {
      setFormData(prev => ({
        ...prev,
        blNumber: bl.blNumber,
        customerName: bl.customerName,
        customerAddress: bl.customerContact?.address || '',
        customerPhone: bl.customerContact?.phone || '',
        vehicleMake: bl.vehicleInfo?.make || '',
        vehicleModel: bl.vehicleInfo?.model || '',
        vehiclePlate: bl.vehicleInfo?.registration || '',
        
        // Import items
        items: [
          ...bl.parts.map(p => ({
            id: `part_${p.id}`,
            type: 'part' as const,
            description: p.name,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            taxRate: 0.20,
            totalPrice: p.totalPrice
          })),
          ...bl.laborItems.map(l => ({
            id: `labor_${l.id}`,
            type: 'service' as const,
            description: l.description,
            quantity: l.hours, // Map hours to quantity
            unitPrice: l.hourlyRate, // Map rate to unit price
            taxRate: 0.20,
            totalPrice: l.totalAmount
          }))
        ]
      }))
      toast.success('Données importées du BL')
    }
  }

  // Handle Item Changes
  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: `item_${Date.now()}`,
      type: 'part',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 0.20,
      totalPrice: 0
    }
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }))
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Recalculate total
    const qty = field === 'quantity' ? Number(value) : newItems[index].quantity
    const price = field === 'unitPrice' ? Number(value) : newItems[index].unitPrice
    newItems[index].totalPrice = qty * price
    
    setFormData(prev => ({ ...prev, items: newItems }))
  }

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  // Totals Calculation
  const totals = formData.items.reduce((acc, item) => {
    const ht = item.quantity * item.unitPrice
    const tva = ht * item.taxRate
    return {
      ht: acc.ht + ht,
      tva: acc.tva + tva,
      ttc: acc.ttc + (ht + tva)
    }
  }, { ht: 0, tva: 0, ttc: 0 })

  // Validation
  const validate = () => {
    if (!formData.customerName) return 'Le client est requis'
    if (!formData.invoiceNumber) return 'Le numéro de facture est requis'
    if (formData.items.length === 0) return 'Au moins une ligne est requise'
    
    // Moroccan Specific Validation
    // ICE is 15 digits
    if (formData.customerIce && !/^\d{15}$/.test(formData.customerIce)) {
        return 'L\'ICE doit contenir exactement 15 chiffres'
    }

    return null
  }

  const handleSave = () => {
    const error = validate()
    if (error) {
      toast.error(error)
      return
    }

    setLoading(true)
    try {
      // Construct Invoice Object
      // We map our form data to the standard Invoice interface + customData
      
      const commonData = {
        customerId: formData.customerId || 'manual', // Fallback for manual entry
        vehicleId: 'manual',
        issueDate: formData.invoiceDate,
        dueDate: formData.invoiceDate, // Default same day for SNTL
        items: formData.items,
        notes: `Période: ${formData.period}`,
        termsAndConditions: formData.legalText,
        
        // SNTL Specifics stored in customData
        customData: {
            customerAddress: formData.customerAddress,
            customerIce: formData.customerIce,
            customerPhone: formData.customerPhone,
            customerCode: formData.customerCode,
            
            period: formData.period,
            contractRef: formData.contractRef,
            blNumber: formData.blNumber, // Save BL Number
            
            origin: formData.origin,
            destination: formData.destination,
            merchandise: formData.merchandise,
            letterNumber: formData.letterNumber,
            
            legalText: formData.legalText,
            
            // Flag to identify this as SNTL invoice type
            invoiceType: 'SNTL'
        }
      }

      // We need a dummy vehicle object for the store's signature
      const dummyVehicle = {
        id: 'manual',
        make: formData.vehicleMake,
        model: formData.vehicleModel,
        year: new Date().getFullYear(),
        vin: '',
        registration: formData.vehiclePlate
      }

      const dummyCustomer = {
          id: formData.customerId || 'manual',
          firstName: formData.customerName.split(' ')[0] || '',
          lastName: formData.customerName.split(' ').slice(1).join(' ') || '',
          phone: formData.customerPhone,
          email: '',
          address: { street: formData.customerAddress, city: '', state: '', zipCode: '', country: 'Maroc' }
      }

      if (id) {
        updateInvoice(id, {
            ...commonData,
            customerName: formData.customerName,
            vehicleInfo: dummyVehicle,
            status: 'validated' // Ensure it's validated
        })
        toast.success('Facture SNTL mise à jour')
      } else {
        const newInvoice = createInvoice({
            ...commonData,
            estimateId: undefined
        } as any, dummyCustomer as any, dummyVehicle)
        
        // Force update customData because createInvoice might clean it if not strictly typed in store implementation (though we added it to type)
        updateInvoice(newInvoice.id, { 
            invoiceNumber: formData.invoiceNumber, // Override generated number
            customData: commonData.customData,
            status: 'validated' // Ensure it's validated
        })
        
        navigate(`/sales/sntl-invoice/${newInvoice.id}`)
        toast.success('Facture SNTL créée')
      }
    } catch (e) {
      console.error(e)
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = async () => {
    setIsPrinting(true)
    try {
      // Pass all items as lines, no separate labor
      const doc = {
        number: formData.invoiceNumber,
        date: formData.invoiceDate,
        // All Lines
        lines: formData.items.map((item, index) => ({
          ref: item.type === 'service' ? 'MO' : `P${index + 1}`,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.totalPrice,
          tvaRate: item.taxRate
        })),
        // Empty Labor to avoid separation in template
        labor: [],
        
        subtotal: totals.ht,
        vatTotal: totals.tva,
        grandTotal: totals.ttc,
        description: formData.contractRef, // Mapped to Accord SNTL
        blNumber: formData.blNumber // Pass BL Number
      }

      const cust = {
        name: formData.customerName,
        address: formData.customerAddress,
        postalCode: '',
        city: '',
        phone: formData.customerPhone,
        email: ''
      }

      const veh = {
        make: formData.vehicleMake,
        model: formData.vehicleModel,
        registration: formData.vehiclePlate,
        vin: '',
        year: new Date().getFullYear(),
        mileage: undefined // Could be mapped if added to form
      }

      const html = renderDocument('facture-sntl', convertWorkshopSettings(workshop!), doc, cust, veh)
      
      await printHtml(html)
    } catch (e) {
      console.error('Print error:', e)
      toast.error("Erreur lors de l'impression")
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-full">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facture SNTL</h1>
            <p className="text-sm text-gray-500">Édition de facture transport & logistique</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} disabled={isPrinting} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
            {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} 
            {isPrinting ? 'Impression...' : 'Imprimer'}
          </button>
          <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Save className="w-4 h-4" /> {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invoice Header Info */}
        <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Informations Facture
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Numéro de facture</label>
              <input 
                type="text" 
                value={formData.invoiceNumber}
                onChange={e => setFormData({...formData, invoiceNumber: e.target.value})}
                className="mt-1 w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input 
                type="date" 
                value={formData.invoiceDate}
                onChange={e => setFormData({...formData, invoiceDate: e.target.value})}
                className="mt-1 w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Période / Référence</label>
              <input 
                type="text" 
                value={formData.period}
                onChange={e => setFormData({...formData, period: e.target.value})}
                placeholder="Ex: Mars 2024"
                className="mt-1 w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Réf Contrat</label>
              <input 
                type="text" 
                value={formData.contractRef}
                onChange={e => setFormData({...formData, contractRef: e.target.value})}
                className="mt-1 w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Client & Fiscalité
          </h2>
          <div className="space-y-3">
             <div>
              <label className="block text-sm font-medium text-gray-700">Sélectionner Bon de Livraison (BL)</label>
              <select 
                value={selectedBlId}
                onChange={handleBlSelect}
                className="mt-1 w-full px-3 py-2 border rounded-md bg-blue-50 border-blue-200"
              >
                <option value="">-- Importer depuis un BL --</option>
                {deliveryNotes.filter(bl => bl.status !== 'cancelled').map(bl => (
                    <option key={bl.id} value={bl.id}>{bl.blNumber} - {bl.customerName}</option>
                ))}
              </select>
            </div>
             
             <div className="border-t pt-2 mt-2">
              <label className="block text-sm font-medium text-gray-700">Sélectionner Client Existant</label>
              <select 
                value={formData.customerId}
                onChange={handleCustomerSelect}
                className="mt-1 w-full px-3 py-2 border rounded-md bg-gray-50"
              >
                <option value="">-- Choisir --</option>
                {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <input 
                    placeholder="Nom / Raison Sociale"
                    value={formData.customerName}
                    onChange={e => setFormData({...formData, customerName: e.target.value})}
                    className="px-3 py-2 border rounded-md"
                />
                 <input 
                    placeholder="Code Client"
                    value={formData.customerCode}
                    onChange={e => setFormData({...formData, customerCode: e.target.value})}
                    className="px-3 py-2 border rounded-md"
                />
            </div>
             <input 
                placeholder="Adresse complète"
                value={formData.customerAddress}
                onChange={e => setFormData({...formData, customerAddress: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
            />
            <div className="grid grid-cols-2 gap-3">
                <div>
                     <input 
                        placeholder="ICE (15 chiffres)"
                        value={formData.customerIce}
                        onChange={e => setFormData({...formData, customerIce: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-md ${formData.customerIce && !/^\d{15}$/.test(formData.customerIce) ? 'border-red-500 bg-red-50' : ''}`}
                    />
                    {formData.customerIce && !/^\d{15}$/.test(formData.customerIce) && <p className="text-xs text-red-500 mt-1">L'ICE doit être valide (15 chiffres)</p>}
                </div>
                 <input 
                    placeholder="Téléphone"
                    value={formData.customerPhone}
                    onChange={e => setFormData({...formData, customerPhone: e.target.value})}
                    className="px-3 py-2 border rounded-md"
                />
            </div>
          </div>
        </div>

        {/* Transport Details */}
        <div className="bg-white p-6 rounded-lg shadow-sm space-y-4 md:col-span-2">
            <h2 className="text-lg font-semibold border-b pb-2">Détails Transport / Véhicule</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input 
                    placeholder="Marque Véhicule"
                    value={formData.vehicleMake}
                    onChange={e => setFormData({...formData, vehicleMake: e.target.value})}
                    className="px-3 py-2 border rounded-md"
                />
                <input 
                    placeholder="Modèle"
                    value={formData.vehicleModel}
                    onChange={e => setFormData({...formData, vehicleModel: e.target.value})}
                    className="px-3 py-2 border rounded-md"
                />
                <input 
                    placeholder="Immatriculation"
                    value={formData.vehiclePlate}
                    onChange={e => setFormData({...formData, vehiclePlate: e.target.value})}
                    className="px-3 py-2 border rounded-md"
                />
                 <input 
                    placeholder="Origine"
                    value={formData.origin}
                    onChange={e => setFormData({...formData, origin: e.target.value})}
                    className="px-3 py-2 border rounded-md"
                />
                 <input 
                    placeholder="Destination"
                    value={formData.destination}
                    onChange={e => setFormData({...formData, destination: e.target.value})}
                    className="px-3 py-2 border rounded-md"
                />
                 <input 
                    placeholder="Marchandise / Type"
                    value={formData.merchandise}
                    onChange={e => setFormData({...formData, merchandise: e.target.value})}
                    className="px-3 py-2 border rounded-md"
                />
                 <input 
                    placeholder="N° Lettre de Voiture"
                    value={formData.letterNumber}
                    onChange={e => setFormData({...formData, letterNumber: e.target.value})}
                    className="px-3 py-2 border rounded-md"
                />
            </div>
        </div>

        {/* Lines */}
        <div className="bg-white p-6 rounded-lg shadow-sm space-y-4 md:col-span-2">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Lignes de la facture</h2>
                <button onClick={handleAddItem} className="flex items-center gap-1 text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100">
                    <Plus className="w-4 h-4" /> Ajouter ligne
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Type</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Désignation</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Qté</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">PU HT</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-24">TVA %</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">Total HT</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {formData.items.map((item, idx) => (
                            <tr key={item.id}>
                                <td className="px-3 py-2">
                                    <select
                                        value={item.type}
                                        onChange={e => updateItem(idx, 'type', e.target.value)}
                                        className="w-full border-none focus:ring-0 text-sm bg-transparent"
                                    >
                                        <option value="part">Article</option>
                                        <option value="service">Main d'œuvre</option>
                                    </select>
                                </td>
                                <td className="px-3 py-2">
                                    <input 
                                        value={item.description}
                                        onChange={e => updateItem(idx, 'description', e.target.value)}
                                        className="w-full border-none focus:ring-0 text-sm"
                                        placeholder="Description..."
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <input 
                                        type="number"
                                        value={item.quantity}
                                        onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                        className="w-full text-center border-gray-200 rounded text-sm p-1"
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <input 
                                        type="number"
                                        value={item.unitPrice}
                                        onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                        className="w-full text-right border-gray-200 rounded text-sm p-1"
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <select 
                                        value={item.taxRate}
                                        onChange={e => updateItem(idx, 'taxRate', parseFloat(e.target.value))}
                                        className="w-full text-center border-gray-200 rounded text-sm p-1"
                                    >
                                        <option value={0.20}>20%</option>
                                        <option value={0.14}>14%</option>
                                        <option value={0.10}>10%</option>
                                        <option value={0.07}>7%</option>
                                        <option value={0}>0%</option>
                                    </select>
                                </td>
                                <td className="px-3 py-2 text-right text-sm font-medium">
                                    {item.totalPrice.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer Totals */}
            <div className="flex justify-end pt-4 border-t">
                <div className="w-64 space-y-2">
                    <div className="flex justify-between text-gray-600">
                        <span>Total HT</span>
                        <span>{formatCurrency(totals.ht)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>Total TVA</span>
                        <span>{formatCurrency(totals.tva)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-blue-900 pt-2 border-t">
                        <span>Total TTC</span>
                        <span>{formatCurrency(totals.ttc)}</span>
                    </div>
                </div>
            </div>
            
             <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Arrêté de facture (Texte légal)</label>
                <textarea
                    value={formData.legalText}
                    onChange={e => setFormData({...formData, legalText: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md text-sm text-gray-600"
                    rows={2}
                />
            </div>
        </div>
      </div>
    </div>
  )
}

export default SNTLInvoicePage
