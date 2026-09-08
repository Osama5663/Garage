export interface SupplierDeliveryNote {
  id: string;
  delivery_note_number: string;
  supplier_id: string;
  purchase_order_id?: string;
  delivery_date: string;
  status: 'draft' | 'validated' | 'invoiced' | 'cancelled';
  total_amount_ht: number;
  total_amount_ttc: number;
  tva_rate: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  validated_at?: string;
  validated_by?: string;
  
  // Joined data
  suppliers?: {
    name: string;
  };
  purchase_orders?: {
    po_number: string;
    order_date: string;
    expected_delivery_date?: string;
  };
  users?: {
    first_name: string;
    last_name: string;
  };
}

export interface SupplierDeliveryNoteItem {
  id: string;
  delivery_note_id: string;
  purchase_order_item_id?: string;
  item_reference: string;
  item_name: string;
  quantity_delivered: number;
  quantity_accepted: number;
  unit_price_ht: number;
  total_price_ht: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  purchase_order_items?: {
    item_reference: string;
    item_name: string;
    quantity_ordered: number;
  };
}

export interface CreateDeliveryNoteData {
  supplier_id: string;
  purchase_order_id?: string;
  delivery_date: string;
  notes?: string;
}

export interface UpdateDeliveryNoteData {
  supplier_id?: string;
  purchase_order_id?: string;
  delivery_date?: string;
  notes?: string;
  tva_rate?: number;
}

export interface DeliveryNoteFilters {
  supplierId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  purchaseOrderId?: string;
}

export interface CreateDeliveryNoteItemData {
  deliveryNoteId: string;
  purchaseOrderItemId?: string;
  itemReference: string;
  itemName: string;
  quantityDelivered: number;
  quantityAccepted: number;
  unitPriceHt: number;
  notes?: string;
}