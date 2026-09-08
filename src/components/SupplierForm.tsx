import React, { useState, useEffect, memo } from 'react';
import { Supplier, SupplierFormData } from '../types/inventory';
import { X, Building, User, Mail, Phone, MapPin, DollarSign, Clock } from 'lucide-react';
import { t } from '../i18n';

interface SupplierFormProps {
  supplier?: Supplier;
  onSubmit: (data: SupplierFormData) => void;
  onClose: () => void;
  mode: 'add' | 'edit';
}

interface FormFieldProps {
  label: string; 
  field: keyof SupplierFormData; 
  type?: string; 
  placeholder?: string; 
  required?: boolean;
  icon?: any;
  value: string | number;
  onChange: (field: keyof SupplierFormData, value: string | number) => void;
  error?: string;
}

const FormField: React.FC<FormFieldProps> = memo(({ 
  label, 
  field, 
  type = 'text', 
  placeholder = '', 
  required = false,
  icon: Icon,
  value,
  onChange,
  error
}) => {
  console.log(`FormField rendering: ${field}`, { value, type });
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        )}
        <input
          type={type}
          value={value ?? ''}
          onChange={(e) => {
            console.log(`Input change in ${field}:`, e.target.value);
            onChange(field, type === 'number' ? (e.target.value ? parseFloat(e.target.value) : 0) : e.target.value);
          }}
          placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            error ? 'border-red-500' : ''
          }`}
          onFocus={() => console.log(`Input focused: ${field}`)}
          onBlur={() => console.log(`Input blurred: ${field}`)}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

export const SupplierForm: React.FC<SupplierFormProps> = memo(({
  supplier,
  onSubmit,
  onClose,
  mode
}) => {
  const [formData, setFormData] = useState<SupplierFormData>({
    name: supplier?.name || '',
    contactPerson: supplier?.contactPerson || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    city: supplier?.city || '',
    postcode: supplier?.postcode || '',
    country: supplier?.country || '',
    paymentTerms: supplier?.paymentTerms || '',
    currency: supplier?.currency || '',
    taxId: supplier?.taxId || '',
    website: supplier?.website || '',
    deliveryTime: supplier?.deliveryTime || 0,
    minimumOrderValue: supplier?.minimumOrderValue || 0,
    minimumOrder: supplier?.minimumOrder || 0,
    status: supplier?.status || 'active',
    notes: supplier?.notes || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    console.log('Form data updated:', formData);
  }, [formData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }

    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = 'Contact person is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.country.trim()) {
      newErrors.country = 'Country is required';
    }

    if (formData.minimumOrderValue && formData.minimumOrderValue < 0) {
      newErrors.minimumOrderValue = 'Minimum order value cannot be negative';
    }

    if (formData.deliveryTime < 0) {
      newErrors.deliveryTime = 'Delivery time cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof SupplierFormData, value: string | number) => {
    console.log('Input change detected:', field, value);
    console.log('Current form data before update:', formData);
    
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('New form data after update:', newData);
      return newData;
    });
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ 
        ...prev, 
        [field]: '' 
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'add' ? t('supplierManagement.modal.addTitle') : t('supplierManagement.modal.editTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Building className="h-5 w-5" />
              {t('supplierManagement.modal.sections.basicInfo')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label={t('supplierManagement.modal.fields.supplierName.label')}
                field="name"
                placeholder={t('supplierManagement.modal.fields.supplierName.placeholder')}
                required
                icon={Building}
                value={formData.name}
                onChange={handleInputChange}
                error={errors.name}
              />
              <FormField
                label={t('supplierManagement.modal.fields.contactPerson.label')}
                field="contactPerson"
                placeholder={t('supplierManagement.modal.fields.contactPerson.placeholder')}
                required
                icon={User}
                value={formData.contactPerson}
                onChange={handleInputChange}
                error={errors.contactPerson}
              />
              <FormField
                label={t('supplierManagement.modal.fields.email.label')}
                field="email"
                type="email"
                placeholder={t('supplierManagement.modal.fields.email.placeholder')}
                required
                icon={Mail}
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
              />
              <FormField
                label={t('supplierManagement.modal.fields.phone.label')}
                field="phone"
                placeholder={t('supplierManagement.modal.fields.phone.placeholder')}
                required
                icon={Phone}
                value={formData.phone}
                onChange={handleInputChange}
                error={errors.phone}
              />
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t('supplierManagement.modal.sections.addressInfo')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label={t('supplierManagement.modal.fields.address.label')}
                field="address"
                placeholder={t('supplierManagement.modal.fields.address.placeholder')}
                required
                icon={MapPin}
                value={formData.address}
                onChange={handleInputChange}
                error={errors.address}
              />
              <FormField
                label={t('supplierManagement.modal.fields.city.label')}
                field="city"
                placeholder={t('supplierManagement.modal.fields.city.placeholder')}
                required
                value={formData.city}
                onChange={handleInputChange}
                error={errors.city}
              />
              <FormField
                label={t('supplierManagement.modal.fields.postcode.label')}
                field="postcode"
                placeholder={t('supplierManagement.modal.fields.postcode.placeholder')}
                value={formData.postcode}
                onChange={handleInputChange}
                error={errors.postcode}
              />
              <FormField
                label={t('supplierManagement.modal.fields.country.label')}
                field="country"
                placeholder={t('supplierManagement.modal.fields.country.placeholder')}
                required
                value={formData.country}
                onChange={handleInputChange}
                error={errors.country}
              />
            </div>
          </div>

          {/* Business Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('supplierManagement.modal.sections.businessInfo')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label={t('supplierManagement.modal.fields.paymentTerms.label')}
                field="paymentTerms"
                placeholder={t('supplierManagement.modal.fields.paymentTerms.placeholder')}
                icon={DollarSign}
                value={formData.paymentTerms ?? ''}
                onChange={handleInputChange}
                error={errors.paymentTerms}
              />
              <FormField
                label={t('supplierManagement.modal.fields.currency.label')}
                field="currency"
                placeholder={t('supplierManagement.modal.fields.currency.placeholder')}
                value={formData.currency ?? ''}
                onChange={handleInputChange}
                error={errors.currency}
              />
              <FormField
                label={t('supplierManagement.modal.fields.taxId.label')}
                field="taxId"
                placeholder={t('supplierManagement.modal.fields.taxId.placeholder')}
                value={formData.taxId ?? ''}
                onChange={handleInputChange}
                error={errors.taxId}
              />
              <FormField
                label={t('supplierManagement.modal.fields.website.label')}
                field="website"
                type="url"
                placeholder={t('supplierManagement.modal.fields.website.placeholder')}
                value={formData.website ?? ''}
                onChange={handleInputChange}
                error={errors.website}
              />
              <FormField
                label={t('supplierManagement.modal.fields.deliveryTime.label')}
                field="deliveryTime"
                type="number"
                placeholder={t('supplierManagement.modal.fields.deliveryTime.placeholder')}
                icon={Clock}
                value={formData.deliveryTime}
                onChange={handleInputChange}
                error={errors.deliveryTime}
              />
              <FormField
                label={t('supplierManagement.modal.fields.minOrderValue.label')}
                field="minimumOrderValue"
                type="number"
                placeholder={t('supplierManagement.modal.fields.minOrderValue.placeholder')}
                icon={DollarSign}
                value={formData.minimumOrderValue ?? 0}
                onChange={handleInputChange}
                error={errors.minimumOrderValue}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('supplierManagement.modal.sections.notes')}</h3>
            <div>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                placeholder={t('supplierManagement.modal.fields.notes.placeholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t('supplierManagement.modal.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {mode === 'add' ? t('supplierManagement.modal.submit') : t('supplierManagement.modal.update')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

// Add display name for debugging
SupplierForm.displayName = 'SupplierForm';
