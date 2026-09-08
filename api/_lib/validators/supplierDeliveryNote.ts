interface DeliveryNoteItem {
  purchase_order_item_id?: string;
  item_reference: string;
  item_name: string;
  quantity_delivered: number;
  quantity_accepted?: number;
  unit_price_ht: number;
  notes?: string;
}

interface DeliveryNoteData {
  supplier_id: string;
  purchase_order_id?: string;
  delivery_date: string;
  notes?: string;
  items: DeliveryNoteItem[];
  tva_rate?: number;
}

interface DeliveryNoteStatusData {
  status: 'draft' | 'validated' | 'invoiced' | 'cancelled';
}

export function validateDeliveryNote(data: any): { success: boolean; data?: DeliveryNoteData; error?: string } {
  try {
    // Required fields validation
    if (!data.supplier_id || typeof data.supplier_id !== 'string') {
      return { success: false, error: 'Supplier ID is required and must be a string' };
    }

    if (!data.delivery_date || !isValidDate(data.delivery_date)) {
      return { success: false, error: 'Delivery date is required and must be a valid date' };
    }

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return { success: false, error: 'Items array is required and must not be empty' };
    }

    // Validate items
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const itemValidation = validateDeliveryNoteItem(item, i);
      if (!itemValidation.success) {
        return itemValidation;
      }
    }

    // Optional fields validation
    if (data.purchase_order_id && typeof data.purchase_order_id !== 'string') {
      return { success: false, error: 'Purchase order ID must be a string' };
    }

    if (data.notes && typeof data.notes !== 'string') {
      return { success: false, error: 'Notes must be a string' };
    }

    if (data.tva_rate !== undefined) {
      if (typeof data.tva_rate !== 'number' || data.tva_rate < 0 || data.tva_rate > 100) {
        return { success: false, error: 'TVA rate must be a number between 0 and 100' };
      }
    }

    return {
      success: true,
      data: {
        supplier_id: data.supplier_id,
        purchase_order_id: data.purchase_order_id,
        delivery_date: data.delivery_date,
        notes: data.notes,
        items: data.items,
        tva_rate: data.tva_rate || 20.00
      }
    };
  } catch (error) {
    return { success: false, error: 'Invalid delivery note data format' };
  }
}

function validateDeliveryNoteItem(item: any, index: number): { success: boolean; error?: string } {
  // Required fields
  if (!item.item_reference || typeof item.item_reference !== 'string') {
    return { success: false, error: `Item ${index + 1}: Item reference is required and must be a string` };
  }

  if (!item.item_name || typeof item.item_name !== 'string') {
    return { success: false, error: `Item ${index + 1}: Item name is required and must be a string` };
  }

  if (item.quantity_delivered === undefined || typeof item.quantity_delivered !== 'number' || item.quantity_delivered <= 0) {
    return { success: false, error: `Item ${index + 1}: Quantity delivered is required and must be a positive number` };
  }

  if (item.unit_price_ht === undefined || typeof item.unit_price_ht !== 'number' || item.unit_price_ht < 0) {
    return { success: false, error: `Item ${index + 1}: Unit price HT is required and must be a non-negative number` };
  }

  // Optional fields validation
  if (item.purchase_order_item_id && typeof item.purchase_order_item_id !== 'string') {
    return { success: false, error: `Item ${index + 1}: Purchase order item ID must be a string` };
  }

  if (item.quantity_accepted !== undefined) {
    if (typeof item.quantity_accepted !== 'number' || item.quantity_accepted < 0) {
      return { success: false, error: `Item ${index + 1}: Quantity accepted must be a non-negative number` };
    }
    if (item.quantity_accepted > item.quantity_delivered) {
      return { success: false, error: `Item ${index + 1}: Quantity accepted cannot be greater than quantity delivered` };
    }
  }

  if (item.notes && typeof item.notes !== 'string') {
    return { success: false, error: `Item ${index + 1}: Notes must be a string` };
  }

  return { success: true };
}

export function validateDeliveryNoteStatus(data: any): { success: boolean; data?: DeliveryNoteStatusData; error?: string } {
  try {
    if (!data.status || typeof data.status !== 'string') {
      return { success: false, error: 'Status is required and must be a string' };
    }

    const validStatuses = ['draft', 'validated', 'invoiced', 'cancelled'];
    if (!validStatuses.includes(data.status)) {
      return { success: false, error: `Status must be one of: ${validStatuses.join(', ')}` };
    }

    return {
      success: true,
      data: {
        status: data.status as DeliveryNoteStatusData['status']
      }
    };
  } catch (error) {
    return { success: false, error: 'Invalid status data format' };
  }
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}