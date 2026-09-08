import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, X } from 'lucide-react'
import useSupplierDeliveryNoteStore from '../stores/supplierDeliveryNoteStore'
import { useSupplierStore } from '../stores/supplierStore'
import { usePurchaseOrders } from '../hooks/usePurchaseOrders'
import { PurchaseOrder } from '../types/inventory'
import { formatCurrency, formatDate } from '../utils/formatters'

interface FormData {
  delivery_note_number: string
  supplier_id: string
  purchase_order_id: string
  delivery_date: string
  notes: string
  items: FormItem[]
}

interface FormItem {
  purchase_order_item_id?: string
  item_reference: string
  item_name: string
  quantity_delivered: number
  quantity_accepted: number
  unit_price_ht: number
  total_price_ht: number
  notes?: string
}

const DeliveryNoteFormPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const { currentDeliveryNote, fetchDeliveryNote, createDeliveryNote, updateDeliveryNote } = useSupplierDeliveryNoteStore()
  const { suppliers, fetchSuppliers } = useSupplierStore()
  const { purchaseOrders, fetchPurchaseOrders } = usePurchaseOrders()

  const [formData, setFormData] = useState<FormData>({
    delivery_note_number: '',
    supplier_id: '',
    purchase_order_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
    notes: '',
    items: []
  })

  const [loading, setLoading] = useState(false)
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrder | null>(null)

  useEffect(() => {
    fetchSuppliers()
    fetchPurchaseOrders()
    
    if (isEdit && id) {
      fetchDeliveryNote(id)
    }
  }, [isEdit, id])

  useEffect(() => {
    if (isEdit && currentDeliveryNote) {
      setFormData({
        delivery_note_number: currentDeliveryNote.delivery_note_number || '',
        supplier_id: currentDeliveryNote.supplier_id,
        purchase_order_id: currentDeliveryNote.purchase_order_id || '',
        delivery_date: currentDeliveryNote.delivery_date,
        notes: currentDeliveryNote.notes || '',
        items: (currentDeliveryNote.items || []).map((item) => ({
          purchase_order_item_id: item.purchase_order_item_id,
          item_reference: item.item_reference,
          item_name: item.item_name,
          quantity_delivered: item.quantity_delivered,
          quantity_accepted: item.quantity_accepted ?? 0,
          unit_price_ht: item.unit_price_ht,
          total_price_ht: item.total_price_ht,
          notes: item.notes
        }))
      })

      if (currentDeliveryNote.purchase_order_id) {
        const po = purchaseOrders.find((po: PurchaseOrder) => po.id === currentDeliveryNote.purchase_order_id)
        setSelectedPurchaseOrder(po || null)
      }
    }
  }, [currentDeliveryNote, isEdit, purchaseOrders])

  const handlePurchaseOrderChange = (purchaseOrderId: string) => {
    const po = purchaseOrders.find(po => po.id === purchaseOrderId)
    setSelectedPurchaseOrder(po || null)
    
    if (po) {
      setFormData(prev => ({
        ...prev,
        purchase_order_id: purchaseOrderId,
        supplier_id: po.supplierId,
        items: po.items.map(item => ({
          purchase_order_item_id: item.id,
          item_reference: item.sku,
          item_name: item.itemName,
          quantity_delivered: 0,
          quantity_accepted: 0,
          unit_price_ht: item.unitCost,
          total_price_ht: 0,
          notes: ''
        }))
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        purchase_order_id: '',
        supplier_id: '',
        items: []
      }))
    }
  }

  const handleItemChange = (index: number, field: keyof FormItem, value: any) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Auto-calculate total price when quantity or unit price changes
    if (field === 'quantity_delivered' || field === 'unit_price_ht') {
      const quantity = field === 'quantity_delivered' ? value : newItems[index].quantity_delivered
      const unitPrice = field === 'unit_price_ht' ? value : newItems[index].unit_price_ht
      newItems[index].total_price_ht = quantity * unitPrice
      
      // Auto-set accepted quantity to delivered quantity if not already set
      if (field === 'quantity_delivered' && newItems[index].quantity_accepted === 0) {
        newItems[index].quantity_accepted = value
      }
    }
    
    setFormData(prev => ({ ...prev, items: newItems }))
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        item_reference: '',
        item_name: '',
        quantity_delivered: 0,
        quantity_accepted: 0,
        unit_price_ht: 0,
        total_price_ht: 0,
        notes: ''
      }]
    }))
  }

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.delivery_note_number.trim()) {
      alert('Le numéro de bon de livraison est requis')
      return false
    }
    
    if (!formData.supplier_id) {
      alert('Le fournisseur est requis')
      return false
    }
    
    if (!formData.delivery_date) {
      alert('La date de livraison est requise')
      return false
    }
    
    if (formData.items.length === 0) {
      alert('Au moins un article est requis')
      return false
    }
    
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i]
      if (!item.item_reference.trim() || !item.item_name.trim()) {
        alert(`L'article ${i + 1} doit avoir une référence et un nom`)
        return false
      }
      if (item.quantity_delivered <= 0) {
        alert(`L'article ${i + 1} doit avoir une quantité livrée positive`)
        return false
      }
      if (item.quantity_accepted < 0 || item.quantity_accepted > item.quantity_delivered) {
        alert(`La quantité acceptée pour l'article ${i + 1} doit être entre 0 et la quantité livrée`)
        return false
      }
      if (item.unit_price_ht < 0) {
        alert(`Le prix unitaire pour l'article ${i + 1} doit être positif`)
        return false
      }
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    
    try {
      const apiData = {
        delivery_note_number: formData.delivery_note_number,
        supplier_id: formData.supplier_id,
        purchase_order_id: formData.purchase_order_id || undefined,
        delivery_date: formData.delivery_date,
        tva_rate: 20,
        notes: formData.notes,
        items: formData.items.map(item => ({
          ...item,
          total_price_ht: item.quantity_delivered * item.unit_price_ht
        }))
      }
      
      if (isEdit && id) {
        await updateDeliveryNote(id, apiData)
      } else {
        await createDeliveryNote(apiData)
      }
      
      navigate('/supplier-delivery-notes')
    } catch (error) {
      console.error('Error saving delivery note:', error)
      alert('Erreur lors de la sauvegarde du bon de livraison')
    } finally {
      setLoading(false)
    }
  }

  const calculateTotals = () => {
    const totalHt = formData.items.reduce((sum, item) => sum + (item.quantity_delivered * item.unit_price_ht), 0)
    const totalTtc = totalHt * 1.2 // Assuming 20% TVA
    return { totalHt, totalTtc }
  }

  const { totalHt, totalTtc } = calculateTotals()

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/supplier-delivery-notes')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Modifier le Bon de Livraison' : 'Créer un Bon de Livraison'}
            </h1>
            <p className="text-gray-600">
              {isEdit ? 'Modifier les détails du bon de livraison' : 'Créer un nouveau bon de livraison fournisseur'}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/supplier-delivery-notes')}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </button>
          <button
            type="submit"
            form="delivery-note-form"
            disabled={loading}
            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Form */}
      <form id="delivery-note-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Header Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Informations Générales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro BL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.delivery_note_number}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_note_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commande d'Achat
              </label>
              <select
                value={formData.purchase_order_id}
                onChange={(e) => handlePurchaseOrderChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isEdit}
              >
                <option value="">Sélectionner une commande...</option>
                {purchaseOrders
                  .filter(po => po.status === 'sent' || po.status === 'confirmed' || po.status === 'partially_received')
                  .map(po => (
                    <option key={po.id} value={po.id}>
                      {po.orderNumber} - {po.supplierName} ({formatDate(po.orderDate)})
                    </option>
                  ))
                }
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fournisseur <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={!!selectedPurchaseOrder}
              >
                <option value="">Sélectionner un fournisseur...</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de Livraison <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notes supplémentaires..."
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Articles</h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter Article
            </button>
          </div>

          {formData.items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Aucun article ajouté. Cliquez sur "Ajouter Article" pour commencer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Référence
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qté Livrée
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qté Acceptée
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix Unitaire HT
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total HT
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.item_reference}
                          onChange={(e) => handleItemChange(index, 'item_reference', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Référence"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.item_name}
                          onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Nom de l'article"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity_delivered}
                          onChange={(e) => handleItemChange(index, 'quantity_delivered', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity_accepted}
                          onChange={(e) => handleItemChange(index, 'quantity_accepted', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="0"
                          max={item.quantity_delivered}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price_ht}
                          onChange={(e) => handleItemChange(index, 'unit_price_ht', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="px-2 py-1 bg-gray-50 rounded text-sm font-medium">
                          {(item.quantity_delivered * item.unit_price_ht).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Notes..."
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Supprimer l'article"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Totaux</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">Total HT</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalHt)}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">TVA (20%)</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalHt * 0.2)}</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <div className="text-sm font-medium text-blue-700">Total TTC</div>
              <div className="text-2xl font-bold text-blue-900">{formatCurrency(totalTtc)}</div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default DeliveryNoteFormPage
