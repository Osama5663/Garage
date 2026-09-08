export interface DeliveryNoteItem {
  id?: string;
  delivery_note_id?: string;
  purchase_order_item_id?: string;
  item_reference: string;
  item_name: string;
  quantity_delivered: number;
  quantity_accepted?: number;
  unit_price_ht: number;
  total_price_ht: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryNote {
  id?: string;
  delivery_note_number?: string;
  supplier_id: string;
  supplier_name?: string;
  reference?: string;
  supplier?: {
    name: string;
    email: string;
    phone: string;
  };
  purchase_order_id?: string;
  purchase_order?: {
    po_number: string;
    order_date: string;
    expected_delivery_date?: string;
  };
  delivery_date: string;
  status: 'draft' | 'validated' | 'invoiced' | 'cancelled';
  total_amount_ht: number;
  total_amount_ttc: number;
  tva_rate: number;
  notes?: string;
  items: DeliveryNoteItem[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  validated_at?: string;
  validated_by?: string;
}

export interface DeliveryNoteFilters {
  supplier_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface DeliveryNoteApiResponse {
  data: DeliveryNote[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const getSessionToken = (): string | null => {
  const authStorage = localStorage.getItem('auth-storage');
  if (!authStorage) return null;
  try {
    const parsed = JSON.parse(authStorage);
    return parsed?.state?.sessionToken ?? null;
  } catch {
    return null;
  }
};

export const supplierDeliveryNoteApi = {
  // Get all delivery notes with pagination and filtering
  async getDeliveryNotes(filters: DeliveryNoteFilters = {}): Promise<DeliveryNoteApiResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const sessionToken = getSessionToken();

    const response = await fetch(`/api/delivery-notes?${params}`, {
      headers: {
        ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch delivery notes: ${response.statusText}`);
    }

    return response.json();
  },

  // Get a single delivery note by ID
  async getDeliveryNote(id: string): Promise<{ data: DeliveryNote }> {
    const sessionToken = getSessionToken();

    const response = await fetch(`/api/delivery-notes/${id}`, {
      headers: {
        ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch delivery note: ${response.statusText}`);
    }

    return response.json();
  },

  // Create a new delivery note
  async createDeliveryNote(deliveryNote: Omit<DeliveryNote, 'id' | 'delivery_note_number' | 'status' | 'total_amount_ht' | 'total_amount_ttc' | 'created_at' | 'updated_at'>): Promise<{ data: DeliveryNote }> {
    const sessionToken = getSessionToken();

    const response = await fetch('/api/delivery-notes', {
      method: 'POST',
      headers: {
        ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(deliveryNote)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to create delivery note: ${response.statusText}`);
    }

    return response.json();
  },

  // Update a delivery note
  async updateDeliveryNote(id: string, deliveryNote: Omit<DeliveryNote, 'id' | 'delivery_note_number' | 'status' | 'total_amount_ht' | 'total_amount_ttc' | 'created_at' | 'updated_at'>): Promise<{ data: DeliveryNote }> {
    const sessionToken = getSessionToken();

    const response = await fetch(`/api/delivery-notes/${id}`, {
      method: 'PUT',
      headers: {
        ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(deliveryNote)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to update delivery note: ${response.statusText}`);
    }

    return response.json();
  },

  // Update delivery note status
  async updateDeliveryNoteStatus(id: string, status: 'draft' | 'validated' | 'invoiced' | 'cancelled'): Promise<{ data: DeliveryNote }> {
    const sessionToken = getSessionToken();
    const isValidate = status === 'validated'
    const isCancel = status === 'cancelled'
    const url = isValidate
      ? `/api/delivery-notes/${id}/validate`
      : isCancel
        ? `/api/delivery-notes/${id}/cancel`
        : `/api/delivery-notes/${id}`
    const method = isValidate || isCancel ? 'POST' : 'PUT'

    const response = await fetch(url, {
      method,
      headers: {
        ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
        ...(isValidate || isCancel ? {} : { 'Content-Type': 'application/json' })
      },
      ...(isValidate || isCancel ? {} : { body: JSON.stringify({ status }) })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to update delivery note status: ${response.statusText}`);
    }

    return response.json();
  },

  // Delete a delivery note
  async deleteDeliveryNote(id: string): Promise<{ message: string }> {
    const sessionToken = getSessionToken();

    const response = await fetch(`/api/delivery-notes/${id}`, {
      method: 'DELETE',
      headers: {
        ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to delete delivery note: ${response.statusText}`);
    }

    return response.json();
  },

  // Get delivery notes by purchase order
  async getDeliveryNotesByPurchaseOrder(poId: string): Promise<{ data: DeliveryNote[] }> {
    const sessionToken = getSessionToken();

    const response = await fetch(`/api/delivery-notes/purchase-order/${poId}`, {
      headers: {
        ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch delivery notes by purchase order: ${response.statusText}`);
    }

    return response.json();
  },

  // Get delivery notes ready for invoicing (validated status)
  async getDeliveryNotesReadyForInvoice(supplierId: string, startDate?: string, endDate?: string): Promise<{ data: DeliveryNote[] }> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const sessionToken = getSessionToken();

    const response = await fetch(`/api/delivery-notes/supplier/${supplierId}/ready-for-invoice?${params}`, {
      headers: {
        ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch delivery notes ready for invoice: ${response.statusText}`);
    }

    return response.json();
  }
};

export default supplierDeliveryNoteApi;
