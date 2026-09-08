import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Car, DollarSign } from 'lucide-react';
import { useDeliveryNoteStore } from '../stores/deliveryNoteStore';
import { useJobOrderStore } from '../stores/jobOrderStore';
import { useCustomerStore } from '../stores/customerStore';
import { JobOrder } from '../types/jobOrder';
import { formatCurrency } from '../utils/formatters';

export const DeliveryNoteForm: React.FC = () => {
  const navigate = useNavigate();
  const { createDeliveryNote, addPartToDeliveryNote } = useDeliveryNoteStore();
  const { jobOrders, deletionMeta, initializeStore } = useJobOrderStore();
  const { customers } = useCustomerStore();



  // Helper function to get status color classes
  const getStatusColorClasses = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'text-blue-600 bg-blue-50';
      case 'waiting-parts':
        return 'text-yellow-600 bg-yellow-50';
      case 'completed':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };
  // const { inventoryItems } = useInventoryStore(); // Commented out as not currently used
  // const { currentUser } = useAuthStore(); // Commented out as not currently used

  const [formData, setFormData] = useState({
    jobOrderId: '',
    customerId: '',
    technicians: [] as string[],
    documentNumber: '',
    notes: ''
  });

  const [selectedJobOrder, setSelectedJobOrder] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedParts, setSelectedParts] = useState<any[]>([]);
  const [selectedLabor, setSelectedLabor] = useState<any[]>([]);

  React.useEffect(() => {
    initializeStore()
  }, [initializeStore])

  const handleJobOrderChange = (jobOrderId: string) => {
    if (!jobOrderId) {
      setSelectedJobOrder(null);
      setSelectedCustomer(null);
      setSelectedParts([]);
      setSelectedLabor([]);
      setFormData(prev => ({
        ...prev,
        jobOrderId: '',
        customerId: '',
        notes: ''
      }));
      return;
    }
    
    const jobOrder = jobOrders.find(jo => jo.id === jobOrderId && !deletionMeta[jo.id]?.deletedAt);
    setSelectedJobOrder(jobOrder);
    setFormData(prev => ({
      ...prev,
      jobOrderId: jobOrderId,
      customerId: jobOrder?.customerId || '',
      notes: jobOrder ? `Bon de livraison créé à partir de l'ordre de réparation ${jobOrder.jobNumber}` : ''
    }));

    if (jobOrder?.customerId) {
      const customer = customers.find(c => c.id === jobOrder.customerId);
      setSelectedCustomer(customer);
    }

    // Sync parts from job order - mirror partsUsed exactly with enhanced data
    if (jobOrder && jobOrder.partsUsed && jobOrder.partsUsed.length > 0) {
      const jobParts = jobOrder.partsUsed.map((part, index) => ({
        id: `part-${Date.now()}-${index}`,
        partId: part.id,
        partNumber: part.partNumber,
        name: part.name,
        description: part.description,
        quantity: part.quantity,
        unitPrice: part.unitCost,
        totalPrice: part.totalCost,
        // supplier: part.supplier,
        status: part.status,
        // location: part.location || '',
        // warrantyInfo: part.warrantyInfo || '',
        // notes: part.notes || '',
        // isWarranty: part.isWarranty || false
      }));
      setSelectedParts(jobParts);
    } else {
      setSelectedParts([]);
    }

    // Sync labor items from job order
    if (jobOrder && jobOrder.laborItems && jobOrder.laborItems.length > 0) {
      const jobLabor = jobOrder.laborItems.map((labor, index) => ({
        id: `labor-${Date.now()}-${index}`,
        description: labor.description,
        hours: labor.hours,
        rate: labor.rate,
        total: labor.total,
        // date: labor.date || new Date().toISOString()
      }));
      setSelectedLabor(jobLabor);
    } else {
      setSelectedLabor([]);
    }
  };

  const handleUpdatePartQuantity = (partId: string, quantity: number) => {
    setSelectedParts(prev => prev.map(p => 
      p.id === partId 
        ? { ...p, quantity: Math.max(1, quantity), totalPrice: p.unitPrice * Math.max(1, quantity) }
        : p
    ));
  };

  const handleUpdatePartPrice = (partId: string, price: number) => {
    setSelectedParts(prev => prev.map(p => 
      p.id === partId 
        ? { ...p, unitPrice: Math.max(0, price), totalPrice: Math.max(0, price) * p.quantity }
        : p
    ));
  };

  const handleRemovePart = (partId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette pièce de ce bon de livraison ?')) {
      setSelectedParts(prev => prev.filter(p => p.id !== partId));
    }
  };

  const handleUpdateLaborHours = (laborId: string, hours: number) => {
    setSelectedLabor(prev => prev.map(l => 
      l.id === laborId 
        ? { ...l, hours: Math.max(0, hours), total: Math.max(0, hours) * l.rate }
        : l
    ));
  };

  const handleRemoveLabor = (laborId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette ligne de main-d\'œuvre ?')) {
      setSelectedLabor(prev => prev.filter(l => l.id !== laborId));
    }
  };

  const calculateTotalParts = () => {
    return selectedParts.reduce((total, part) => total + part.totalPrice, 0);
  };

  const calculateTotalLabor = () => {
    return selectedLabor.reduce((total, labor) => total + labor.total, 0);
  };

  const calculateGrandTotal = () => {
    return calculateTotalParts() + calculateTotalLabor();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation
    const errors = [];
    
    if (!formData.jobOrderId) {
      errors.push('Veuillez sélectionner un ordre de réparation');
    }
    
    if (!formData.customerId) {
      errors.push('Veuillez sélectionner un client');
    }
    
    
    if (selectedParts.length === 0 && selectedLabor.length === 0) {
      errors.push('Veuillez ajouter au moins une pièce ou une ligne de main-d\'œuvre');
    }
    
    if (errors.length > 0) {
      alert('Veuillez corriger les erreurs suivantes :\n• ' + errors.join('\n• '));
      return;
    }

    try {
      const jobOrderData = {
        customerName: `${selectedCustomer?.firstName || ''} ${selectedCustomer?.lastName || ''}`.trim(),
        customerContact: {
          email: selectedCustomer?.email || '',
          phone: selectedCustomer?.phone || '',
          address: selectedCustomer && selectedCustomer.address ? `${selectedCustomer.address.street}, ${selectedCustomer.address.city} ${selectedCustomer.address.state} ${selectedCustomer.address.zipCode}` : ''
        },
        vehicleInfo: selectedJobOrder?.vehicleInfo || {
          make: '',
          model: '',
          year: new Date().getFullYear(),
          vin: '',
          registration: ''
        },
        jobsPerformed: [],
        partsUsed: selectedParts,
        laborItems: selectedLabor,
        technicians: []
      };

      const newDeliveryNote = await createDeliveryNote(formData, jobOrderData);
      
      // Add parts to the delivery note (if not already included by createDeliveryNote)
      if (newDeliveryNote && selectedParts.length > 0) {
        selectedParts.forEach(part => {
          addPartToDeliveryNote(newDeliveryNote.id, part);
        });
      }

      // Navigate to the newly created delivery note
      if (newDeliveryNote) {
        navigate(`/delivery-notes/${newDeliveryNote.id}`);
      } else {
        navigate('/delivery-notes');
      }
    } catch (error) {
      console.error('Error creating delivery note:', error);
      
      let errorMessage = 'Une erreur s\'est produite lors de la création du bon de livraison';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      alert(`Erreur lors de la création du bon de livraison :\n${errorMessage}\n\nVeuillez vérifier vos données et réessayer.`);
    }
  };

  const availableJobOrders = jobOrders.filter(
    (jo) =>
      !deletionMeta[jo.id]?.deletedAt &&
      (jo.status === 'completed' || jo.status === 'in-progress' || jo.status === 'waiting-parts')
  );

  // Organize job orders by status with chronological sorting
  const organizedJobOrders = React.useMemo(() => {
    const grouped = {
      'in-progress': [] as JobOrder[],
      'waiting-parts': [] as JobOrder[],
      'completed': [] as JobOrder[]
    };

    // Group jobs by status
    availableJobOrders.forEach(job => {
      if (job.status in grouped) {
        grouped[job.status as keyof typeof grouped].push(job);
      }
    });

    // Sort each group chronologically (newest first)
    Object.keys(grouped).forEach(status => {
      grouped[status as keyof typeof grouped].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return grouped;
  }, [availableJobOrders]);

  // Status category labels and colors
  const statusCategories = [
    { key: 'in-progress', label: 'In Progress', color: 'blue' },
    { key: 'waiting-parts', label: 'Waiting Parts', color: 'yellow' },
    { key: 'completed', label: 'Completed', color: 'green' }
  ];

  // AUTO-TEST: Automatically select first job order if available and none selected
  React.useEffect(() => {
    if (availableJobOrders.length > 0 && !selectedJobOrder && !formData.jobOrderId) {
      handleJobOrderChange(availableJobOrders[0].id);
    }
  }, [availableJobOrders.length, selectedJobOrder, formData.jobOrderId]);

  

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedJobOrder ? 'Créer un bon de livraison à partir d\'un OR' : 'Créer un nouveau bon de livraison'}
            </h1>
          </div>
          <button
            onClick={() => navigate('/delivery-notes')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Job Order & Customer Information - Clean Redesigned Layout */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            {/* Unified Job Order & Vehicle Information Section */}
            <div className="space-y-6">
              {/* Unified Layout with Job Selection in Vehicle Details */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                  {/* Job Selection Integrated with Vehicle Details */}
                  <div className="space-y-6">
                    {/* Job Selection Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Sélection de l'ordre de réparation
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Sélectionnez un ordre de réparation pour voir les détails de livraison
                        </p>
                      </div>
                      {selectedJobOrder && (
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColorClasses(selectedJobOrder.status)}`}>
                          {selectedJobOrder.status.replace('-', ' ').toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    {/* Job Selection Dropdown */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sélectionner un ordre de réparation <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.jobOrderId}
                        onChange={(e) => handleJobOrderChange(e.target.value)}
                        className="w-full text-base bg-white border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 transition-all duration-200 appearance-none cursor-pointer"
                        required
                      >
                        <option value="" className="text-gray-500">
                          Choisissez un ordre de réparation dans la liste
                        </option>
                        
                        {statusCategories.map(category => {
                          const jobsInCategory = organizedJobOrders[category.key as keyof typeof organizedJobOrders];
                          if (jobsInCategory.length === 0) return null;
                          
                          return (
                            <optgroup key={category.key} label={`${category.label} (${jobsInCategory.length})`} className="font-semibold text-gray-700">
                              {jobsInCategory.map((jobOrder) => (
                                <option key={jobOrder.id} value={jobOrder.id} className="text-gray-900 py-2">
                                  {jobOrder.jobNumber}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                      
                      {/* Custom Dropdown Arrow */}
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Vehicle Details - Shown when job is selected */}
                    {selectedJobOrder && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-base font-semibold text-gray-900">
                            Informations véhicule
                          </h4>
                          <div className="bg-white rounded-full px-3 py-1 text-xs font-medium text-blue-600">
                            {selectedJobOrder.jobNumber}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-blue-100">
                            <span className="text-sm font-medium text-gray-600">Véhicule</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {selectedJobOrder.vehicleInfo.year} {selectedJobOrder.vehicleInfo.make} {selectedJobOrder.vehicleInfo.model}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center py-2 border-b border-blue-100">
                            <span className="text-sm font-medium text-gray-600">Immatriculation</span>
                            <span className="text-sm font-mono font-semibold text-gray-900">
                              {selectedJobOrder.vehicleInfo.registration}
                            </span>
                          </div>
                          
                          {selectedCustomer && (
                            <div className="flex justify-between items-center py-2">
                              <span className="text-sm font-medium text-gray-600">Client</span>
                              <span className="text-sm font-semibold text-gray-900">
                                {selectedCustomer.firstName} {selectedCustomer.lastName}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Empty State - Shown when no job is selected */}
                    {!selectedJobOrder && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                        <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <Car className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-600 mb-2">
                          Aucun ordre de réparation sélectionné
                        </p>
                        <p className="text-xs text-gray-500">
                          Sélectionnez un ordre de réparation pour afficher les détails du véhicule
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Parts Used - Compact List Layout */}
        {selectedJobOrder && (
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900 flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                Pièces utilisées ({selectedParts.length})
              </h2>
              {selectedParts.length > 0 && (
                <span className="text-sm font-medium text-gray-900">
                  Total: {formatCurrency(calculateTotalParts())}
                </span>
              )}
            </div>
            
              {selectedParts.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-sm text-gray-500">Aucune pièce utilisée</p>
                <p className="text-xs text-gray-400">Les pièces seront synchronisées à partir de l'ordre de réparation</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedParts.map((part) => (
                  <div key={part.id} className="bg-gray-50 rounded-md p-3 border border-gray-200">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{part.name}</h4>
                        <p className="text-xs text-gray-600">{part.partNumber}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          part.status === 'installed' ? 'bg-green-100 text-green-800' :
                          part.status === 'received' ? 'bg-blue-100 text-blue-800' :
                          part.status === 'ordered' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {part.status.toUpperCase()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePart(part.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-600 mt-2">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                          <span className="mr-1">Qté :</span>
                          <input
                            type="number"
                            value={part.quantity}
                            onChange={(e) => handleUpdatePartQuantity(part.id, parseInt(e.target.value) || 1)}
                            className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center"
                            min="1"
                          />
                        </div>
                        <div className="flex items-center">
                          <span className="mr-1">Prix :</span>
                          <input
                            type="number"
                            value={part.unitPrice}
                            onChange={(e) => handleUpdatePartPrice(part.id, parseFloat(e.target.value) || 0)}
                            className="w-20 px-1 py-0.5 border border-gray-300 rounded text-right"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                      <span className="font-medium text-gray-900">{formatCurrency(part.totalPrice)}</span>
                    </div>
                    
                    {part.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2 italic">{part.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Labor Information - Compact List Layout */}
        {selectedJobOrder && (
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900 flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                Main-d'œuvre ({selectedLabor.length})
              </h2>
              {selectedLabor.length > 0 && (
                <span className="text-sm font-medium text-gray-900">
                  Total: {formatCurrency(calculateTotalLabor())}
                </span>
              )}
            </div>
            
            {selectedLabor.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-sm text-gray-500">Aucune main-d'œuvre enregistrée</p>
                <p className="text-xs text-gray-400">Les lignes de main-d'œuvre seront synchronisées à partir de l'ordre de réparation</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedLabor.map((labor: any) => (
                  <div key={labor.id} className="bg-gray-50 rounded-md p-3 border border-gray-200">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{labor.description}</h4>
                        <p className="text-xs text-gray-600">{labor.technician}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(labor.total)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLabor(labor.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-600 mt-2">
                      <div className="flex items-center space-x-3">
                      <div className="flex items-center">
                          <span className="mr-1">Heures :</span>
                          <input
                            type="number"
                            value={labor.hours}
                            onChange={(e) => handleUpdateLaborHours(labor.id, parseFloat(e.target.value) || 0)}
                            className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center"
                            min="0"
                            step="0.5"
                          />
                        </div>
                      </div>
                      <span>{formatCurrency(labor.rate)}/h</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Total Summary - Compact Layout */}
        {selectedJobOrder && (selectedParts.length > 0 || selectedLabor.length > 0) && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-gray-900 flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-indigo-600" />
                Récapitulatif des coûts
              </h2>
              <span className="text-lg font-bold text-indigo-600">
                {formatCurrency(calculateGrandTotal())}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {selectedParts.length > 0 && (
                <div className="flex justify-between items-center bg-white bg-opacity-50 rounded px-2 py-1">
                  <span className="text-gray-700">Pièces :</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(calculateTotalParts())}
                  </span>
                </div>
              )}
              {selectedLabor.length > 0 && (
                <div className="flex justify-between items-center bg-white bg-opacity-50 rounded px-2 py-1">
                  <span className="text-gray-700">Main-d'œuvre :</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(calculateTotalLabor())}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Notes - Compact Layout */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Notes supplémentaires</h2>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            placeholder="Notes ou instructions particulières..."
            className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/delivery-notes')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </button>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer le bon de livraison
          </button>
        </div>
      </form>
    </div>
  );
};
