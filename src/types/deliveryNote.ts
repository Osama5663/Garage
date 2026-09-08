export interface DeliveryNote {
  id: string;
  blNumber: string;
  jobOrderId: string;
  customerId: string;
  customerName: string;
  customerContact: {
    email: string;
    phone: string;
    address: string;
  };
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    vin: string;
    registration: string;
    mileage?: number;
  };
  
  // Delivery Note Details
  issueDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: 'draft' | 'pending' | 'validated' | 'approved' | 'issued' | 'delivered' | 'invoiced' | 'cancelled';
  
  // Jobs/Tasks Performed
  jobsPerformed: DeliveryNoteJob[];
  
  // Parts Information
  parts: DeliveryNotePart[];
  totalParts: number;
  totalPartsValue: number;
  
  // Labor Information
  laborItems: DeliveryNoteLabor[];
  totalLaborValue: number;
  
  // Cost Summary
  subtotal: number;
  taxAmount: number;
  totalValue: number;
  
  // Delivery Information (captured later in BL, not required in pre-invoice)
  deliveryAddress?: string;
  deliveryContact?: string;
  deliveryNotes?: string;
  
  // Technician Information
  technicians: DeliveryNoteTechnician[];
  
  // Document Control
  documentNumber: string;
  version: string;
  
  // Signatures
  signatures: {
    customer?: {
      name: string;
      date: string;
      signature?: string; // Base64 encoded signature image
    };
    technician?: {
      name: string;
      date: string;
      signature?: string; // Base64 encoded signature image
    };
    authorizedBy?: {
      name: string;
      date: string;
      signature?: string; // Base64 encoded signature image
    };
  };
  
  // Document Status
  isSigned: boolean;
  isPrinted: boolean;
  printCount: number;
  lastPrintedAt?: string;
  
  // References
  relatedInvoiceId?: string;
  relatedEstimateId?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  notes: string;
  
  // Audit & History
  auditLogs?: DeliveryNoteAuditLog[];
  versionHistory?: Record<string, Partial<DeliveryNote>>;
}

export interface DeliveryNoteAuditLog {
  id: string;
  action: 'create' | 'update' | 'status_change' | 'print' | 'sign' | 'convert_to_invoice' | 'delete';
  entityType: 'delivery_note';
  entityId: string;
  userId: string;
  userName: string;
  timestamp: string;
  details: string;
  oldValue?: any;
  newValue?: any;
}

export interface DeliveryNoteJob {
  id: string;
  jobNumber: string;
  description: string;
  detailedDescription?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours: number;
  actualHours: number;
  completedDate?: string;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface DeliveryNotePart {
  id: string;
  partId: string;
  partNumber: string;
  name: string;
  description: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
  supplier?: string;
  location?: string;
  warrantyInfo?: string;
  notes?: string;
  isWarranty?: boolean;
}

export interface DeliveryNoteLabor {
  id: string;
  description: string;
  hours: number;
  hourlyRate: number;
  totalAmount: number;
  technician?: string;
  notes?: string;
}

export interface DeliveryNoteTechnician {
  id: string;
  name: string;
  role: string;
  licenseNumber?: string;
  contactInfo?: {
    phone: string;
    email: string;
  };
  signature?: string; // Base64 encoded signature image
}

export interface DeliveryNoteFormData {
  jobOrderId: string;
  customerId: string;
  expectedDeliveryDate?: string;
  deliveryAddress?: string;
  deliveryContact?: string;
  deliveryNotes?: string;
  notes: string;
  technicians: string[]; // Array of technician IDs
  documentNumber: string;
  jobsPerformed?: DeliveryNoteJob[];
  diagnosticReports?: any[];
}

export interface DeliveryNoteStatusHistory {
  id: string;
  blId: string;
  status: string;
  changedBy: string;
  changedAt: string;
  notes: string;
}

export interface DeliveryNotePrintSettings {
  includeLabor: boolean;
  includePricing: boolean;
  includeSignatures: boolean;
  includeWarranty: boolean;
  showCompanyLogo: boolean;
  showWatermarks: boolean;
  paperSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
}

export interface DeliveryNoteConversionData {
  convertToInvoice: boolean;
  invoiceSettings: {
    paymentTerms: string;
    dueDate: string;
    taxRate: number;
    includeLabor: boolean;
    notes: string;
  };
}
