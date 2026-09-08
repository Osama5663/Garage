import { useState, useEffect, useCallback } from 'react'
import { purchaseOrderApi, type PurchaseOrder as ApiPurchaseOrder } from '../services/purchaseOrderApi'
import type { PurchaseOrder } from '../types/inventory'
import { useInventoryStore } from '../stores/inventoryStore'

export interface PurchaseOrderFilters {
  supplier_id?: string
  supplier_email?: string
  status?: string
  order_date_from?: string
  order_date_to?: string
  search?: string
}

const mapApiOrderToPurchaseOrder = (order: ApiPurchaseOrder): PurchaseOrder => {
  const subtotal = order.total_amount_ht ?? 0
  const total = order.total_amount_ttc ?? subtotal
  const tax = total - subtotal
  const items =
    (order as any).purchase_order_items?.map((item: any) => ({
      id: item.id,
      itemId: item.inventory_item_id || item.item_reference || '',
      inventoryItemId: item.inventory_item_id || '',
      itemName: item.item_name || '',
      sku: item.item_reference || '',
      quantityOrdered: item.quantity_ordered ?? 0,
      quantityReceived: 0,
      unitCost: item.unit_price_ht ?? 0,
      totalCost: item.total_price_ht ?? 0,
      receivedBatches: [],
      status: 'pending',
      name: item.item_name || ''
    })) || []

  return {
    id: order.id,
    orderNumber: order.po_number,
    supplierId: order.supplier_id,
    supplierName: order.suppliers?.name || '',
    items,
    subtotal,
    taxAmount: tax,
    shippingCost: 0,
    totalAmount: total,
    status: order.status,
    orderDate: order.order_date,
    expectedDeliveryDate: order.expected_delivery_date,
    actualDeliveryDate: undefined,
    expectedDate: order.expected_delivery_date || order.order_date,
    reference: order.po_number,
    paymentStatus: 'pending',
    paymentTerms: '',
    referenceNumber: order.po_number,
    notes: order.notes,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    createdBy: order.created_by || ''
  }
}

export const usePurchaseOrders = (filters?: PurchaseOrderFilters) => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPurchaseOrders = useCallback(async (filterParams?: PurchaseOrderFilters) => {
    setLoading(true)
    setError(null)

    try {
      const params = { ...filterParams }
      if (params && params.status === 'all') {
        delete params.status
      }
      const data = await purchaseOrderApi.list(params)
      const mappedData = (data || []).map(mapApiOrderToPurchaseOrder)
      setPurchaseOrders(mappedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch purchase orders')
      console.error('Error fetching purchase orders:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createPurchaseOrder = useCallback(async (data: any) => {
    setLoading(true)
    setError(null)

    try {
      if (!data.supplierId && !data.supplier_id) {
        throw new Error('Supplier is required for purchase order')
      }

      const items = data.items || []
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Purchase order must contain at least one item')
      }

      const total_amount_ht = items.reduce(
        (sum: number, item: any) => sum + (item.unitCost * item.quantity),
        0
      )
      const tva_rate = 20
      const total_amount_ttc = total_amount_ht * (1 + tva_rate / 100)

      const created = await purchaseOrderApi.create({
        po_number: data.orderNumber || data.po_number || data.referenceNumber || `PO-${Date.now()}`,
        supplier_id: data.supplierId || data.supplier_id,
        order_date: data.orderDate || new Date().toISOString(),
        expected_delivery_date: data.expectedDeliveryDate,
        status: data.status || 'draft',
        total_amount_ht,
        total_amount_ttc,
        tva_rate,
        notes: data.notes,
        items: items.map((item: any) => ({
          item_reference: item.sku || item.item_reference || 'REF',
          item_name: item.itemName || item.item_name || 'Item',
          quantity_ordered: item.quantity ?? item.quantityOrdered ?? 0,
          unit_price_ht: item.unitCost ?? item.unit_price_ht ?? 0,
          total_price_ht:
            (item.quantity ?? item.quantityOrdered ?? 0) *
            (item.unitCost ?? item.unit_price_ht ?? 0),
          notes: item.notes
        }))
      })

      await fetchPurchaseOrders(filters)
      return created
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        err?.details ||
        'Failed to create purchase order'

      console.error('Error creating purchase order:', err)
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [filters, fetchPurchaseOrders])

  const updatePurchaseOrder = useCallback(async (id: string, data: any) => {
    setLoading(true)
    setError(null)

    try {
      const updateData: any = {}
      if (data.status) updateData.status = data.status
      if (data.notes !== undefined) updateData.notes = data.notes
      if (data.expectedDeliveryDate) {
        updateData.expected_delivery_date = data.expectedDeliveryDate
      }

      if (data.items) {
        const items = data.items
        const total_amount_ht = items.reduce(
          (sum: number, item: any) => sum + (item.unitCost * item.quantity),
          0
        )
        const tva_rate = 20
        const total_amount_ttc = total_amount_ht * (1 + tva_rate / 100)
        updateData.items = items.map((item: any) => ({
          item_reference: item.sku || item.item_reference || 'REF',
          item_name: item.itemName || item.item_name || 'Item',
          quantity_ordered: item.quantity ?? item.quantityOrdered ?? 0,
          unit_price_ht: item.unitCost ?? item.unit_price_ht ?? 0,
          total_price_ht:
            (item.quantity ?? item.quantityOrdered ?? 0) *
            (item.unitCost ?? item.unit_price_ht ?? 0),
          notes: item.notes
        }))
        updateData.total_amount_ht = total_amount_ht
        updateData.total_amount_ttc = total_amount_ttc
        updateData.tva_rate = tva_rate
      }

      const updatedOrder = await purchaseOrderApi.update(id, updateData)
      await fetchPurchaseOrders(filters)
      return updatedOrder
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update purchase order')
      throw err
    } finally {
      setLoading(false)
    }
  }, [filters, fetchPurchaseOrders])

  const deletePurchaseOrder = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      await purchaseOrderApi.delete(id)
      await fetchPurchaseOrders(filters)
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        err?.details ||
        'Failed to delete purchase order'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [filters, fetchPurchaseOrders])

  const receivePurchaseOrder = useCallback(async (id: string, items: any[]) => {
    // Update status to received
    await updatePurchaseOrder(id, { status: 'received' })

    // Update inventory stock
    // We dynamically import the store to avoid circular dependencies if any, 
    // or just use the global hook if available. 
    // Since we are in a hook, we can't easily use another hook conditionally or inside a callback 
    // without it being defined at top level.
    // However, we can access the store directly if it exports `useInventoryStore.getState()`
    // checking imports... we need to import useInventoryStore first.
    
    try {
      const { receiveStock } = useInventoryStore.getState()

      for (const item of items) {
        if (item.quantity > 0 && item.inventoryItemId) {
          await receiveStock(
            item.inventoryItemId,
            item.quantity,
            item.unitCost,
            `PO-${id}`,
            item.batchNumber,
            item.expiryDate
          )
        }
      }
    } catch (e) {
      console.error('Failed to update inventory stock:', e)
    }
  }, [updatePurchaseOrder])

  const getPurchaseOrdersForSupplier = useCallback(async (supplierId: string): Promise<PurchaseOrder[]> => {
    setLoading(true)
    setError(null)

    try {
      const data = await purchaseOrderApi.getBySupplierId(supplierId)
      const mappedData = (data || []).map(mapApiOrderToPurchaseOrder)
      return mappedData
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch purchase orders for supplier')
      console.error(err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch purchase orders on mount and when filters change
  useEffect(() => {
    fetchPurchaseOrders(filters)
  }, [filters, fetchPurchaseOrders])

  const getPurchaseOrderItems = useCallback(async (purchaseOrderId: string) => {
    setLoading(true)
    setError(null)

    try {
      const order = await purchaseOrderApi.getById(purchaseOrderId)
      const items = (order as any).purchase_order_items || []
      return items
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch purchase order items')
      console.error(err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    purchaseOrders,
    loading,
    error,
    fetchPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    receivePurchaseOrder,
    getPurchaseOrderItems,
    getPurchaseOrdersForSupplier
  }
}
