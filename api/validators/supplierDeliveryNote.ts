interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateDeliveryNote(data: any): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!data.supplier_id) {
    errors.push('Supplier ID is required');
  }

  if (!data.delivery_date) {
    errors.push('Delivery date is required');
  }

  // Validate delivery date format
  if (data.delivery_date && isNaN(Date.parse(data.delivery_date))) {
    errors.push('Invalid delivery date format');
  }

  // Validate TVA rate
  if (data.tva_rate !== undefined) {
    const tvaRate = parseFloat(data.tva_rate);
    if (isNaN(tvaRate) || tvaRate < 0 || tvaRate > 100) {
      errors.push('TVA rate must be between 0 and 100');
    }
  }

  // Validate status if provided
  if (data.status && !['draft', 'validated', 'invoiced', 'cancelled'].includes(data.status)) {
    errors.push('Invalid status. Must be one of: draft, validated, invoiced, cancelled');
  }

  // Validate items if provided
  if (data.items && Array.isArray(data.items)) {
    if (data.items.length === 0) {
      errors.push('Delivery note must have at least one item');
    } else {
      data.items.forEach((item: any, index: number) => {
        const itemValidation = validateDeliveryNoteItem(item);
        if (!itemValidation.isValid) {
          errors.push(`Item ${index + 1}: ${itemValidation.errors.join(', ')}`);
        }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateDeliveryNoteItem(data: any): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!data.item_reference) {
    errors.push('Item reference is required');
  }

  if (!data.item_name) {
    errors.push('Item name is required');
  }

  // Validate quantities
  if (data.quantity_delivered === undefined || data.quantity_delivered === null) {
    errors.push('Quantity delivered is required');
  } else {
    const quantityDelivered = parseInt(data.quantity_delivered);
    if (isNaN(quantityDelivered) || quantityDelivered <= 0) {
      errors.push('Quantity delivered must be a positive integer');
    }
  }

  if (data.quantity_accepted === undefined || data.quantity_accepted === null) {
    errors.push('Quantity accepted is required');
  } else {
    const quantityAccepted = parseInt(data.quantity_accepted);
    if (isNaN(quantityAccepted) || quantityAccepted < 0) {
      errors.push('Quantity accepted must be a non-negative integer');
    }
  }

  // Validate that accepted quantity is not greater than delivered quantity
  if (data.quantity_delivered !== undefined && data.quantity_accepted !== undefined) {
    const quantityDelivered = parseInt(data.quantity_delivered);
    const quantityAccepted = parseInt(data.quantity_accepted);
    if (!isNaN(quantityDelivered) && !isNaN(quantityAccepted) && quantityAccepted > quantityDelivered) {
      errors.push('Quantity accepted cannot be greater than quantity delivered');
    }
  }

  // Validate unit price
  if (data.unit_price_ht === undefined || data.unit_price_ht === null) {
    errors.push('Unit price HT is required');
  } else {
    const unitPrice = parseFloat(data.unit_price_ht);
    if (isNaN(unitPrice) || unitPrice < 0) {
      errors.push('Unit price HT must be a non-negative number');
    }
  }

  // Validate total price
  if (data.total_price_ht !== undefined && data.total_price_ht !== null) {
    const totalPrice = parseFloat(data.total_price_ht);
    if (isNaN(totalPrice) || totalPrice < 0) {
      errors.push('Total price HT must be a non-negative number');
    }
  }

  // Calculate total price if not provided
  if (data.total_price_ht === undefined || data.total_price_ht === null) {
    if (data.quantity_accepted !== undefined && data.unit_price_ht !== undefined) {
      const quantityAccepted = parseInt(data.quantity_accepted);
      const unitPrice = parseFloat(data.unit_price_ht);
      if (!isNaN(quantityAccepted) && !isNaN(unitPrice)) {
        data.total_price_ht = quantityAccepted * unitPrice;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateDeliveryNoteUpdate(data: any): ValidationResult {
  const errors: string[] = [];

  // Only allow certain fields to be updated
  const allowedFields = ['delivery_date', 'notes', 'tva_rate', 'items'];
  const invalidFields = Object.keys(data).filter(key => !allowedFields.includes(key));
  
  if (invalidFields.length > 0) {
    errors.push(`Cannot update fields: ${invalidFields.join(', ')}`);
  }

  // Validate delivery date if provided
  if (data.delivery_date && isNaN(Date.parse(data.delivery_date))) {
    errors.push('Invalid delivery date format');
  }

  // Validate TVA rate if provided
  if (data.tva_rate !== undefined) {
    const tvaRate = parseFloat(data.tva_rate);
    if (isNaN(tvaRate) || tvaRate < 0 || tvaRate > 100) {
      errors.push('TVA rate must be between 0 and 100');
    }
  }

  // Validate items if provided
  if (data.items && Array.isArray(data.items)) {
    if (data.items.length === 0) {
      errors.push('Delivery note must have at least one item');
    } else {
      data.items.forEach((item: any, index: number) => {
        const itemValidation = validateDeliveryNoteItem(item);
        if (!itemValidation.isValid) {
          errors.push(`Item ${index + 1}: ${itemValidation.errors.join(', ')}`);
        }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}