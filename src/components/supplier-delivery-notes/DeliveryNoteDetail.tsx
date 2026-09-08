import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Package,
  ArrowLeft,
  Edit,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  User,
  DollarSign,
  Tag,
  AlertCircle,
  Printer,
  Download,
  Clock,
  Trash2
} from 'lucide-react';
import { useDeliveryNotes } from '../../hooks/useDeliveryNotes';
import { useSuppliers } from '../../hooks/useSuppliers';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { PrintableSupplierDeliveryNote } from '../PrintableSupplierDeliveryNote';
import { t } from '../../i18n';
import { api } from '../../services/api';
import { purchaseOrderApi } from '../../services/purchaseOrderApi';

const DeliveryNoteDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { deliveryNote, loading, error, validateDeliveryNote, cancelDeliveryNote, deleteDeliveryNote } = useDeliveryNotes(id!);
  const { suppliers, fetchSuppliers } = useSuppliers();
  const [validationLoading, setValidationLoading] = useState(false);
  const [cancellationLoading, setCancellationLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [resolvedSupplierName, setResolvedSupplierName] = useState<string | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const resolveSupplier = async () => {
      if (!deliveryNote) {
        setResolvedSupplierName(null);
        return;
      }

      if (deliveryNote.suppliers?.name) {
        setResolvedSupplierName(deliveryNote.suppliers.name);
        return;
      }

      const directSupplier = suppliers.find(s => s.id === deliveryNote.supplier_id);
      if (directSupplier?.name) {
        setResolvedSupplierName(directSupplier.name);
        return;
      }

      const supplierId = deliveryNote.supplier_id;
      if (supplierId && /^[0-9a-f]{24}$/i.test(supplierId)) {
        try {
          const response = await api.get(`/suppliers/${supplierId}`);
          const payload = response.data?.data ?? response.data;
          if (payload?.name) {
            setResolvedSupplierName(payload.name);
            return;
          }
        } catch (err) {
          void err;
        }
      }

      if (deliveryNote.purchase_order_id) {
        try {
          const po = await purchaseOrderApi.getById(deliveryNote.purchase_order_id);
          const poSupplierName =
            (po as any).suppliers?.name ||
            (po as any).supplier?.name ||
            '';
          if (poSupplierName) {
            setResolvedSupplierName(poSupplierName);
            return;
          }
          const poSupplierId = (po as any).supplier_id;
          const supplierFromPo = suppliers.find(s => s.id === poSupplierId);
          if (supplierFromPo?.name) {
            setResolvedSupplierName(supplierFromPo.name);
            return;
          }
        } catch (err) {
          void err;
        }
      }

      setResolvedSupplierName(null);
    };

    resolveSupplier();
  }, [deliveryNote, suppliers]);

  const getSupplierName = () => {
    if (!deliveryNote) {
      return t('common.unknown');
    }

    if (deliveryNote.suppliers?.name) {
      return deliveryNote.suppliers.name;
    }

    const supplier = suppliers.find(s => s.id === deliveryNote.supplier_id);
    if (supplier?.name) {
      return supplier.name;
    }

    if (resolvedSupplierName) {
      return resolvedSupplierName;
    }

    return t('common.unknown');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      validated: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      invoiced: { color: 'bg-blue-100 text-blue-800', icon: FileText },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4 mr-2" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleValidate = async () => {
    if (!window.confirm('Are you sure you want to validate this delivery note? This action cannot be undone.')) {
      return;
    }

    try {
      setValidationLoading(true);
      await validateDeliveryNote(id!);
    } catch (err) {
      console.error('Validation error:', err);
      alert(`Failed to validate delivery note: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setValidationLoading(false);
    }
  };

  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation.');
      return;
    }

    try {
      setCancellationLoading(true);
      await cancelDeliveryNote(id!, cancelReason);
      setShowCancelModal(false);
      setCancelReason('');
    } catch (err) {
      alert('Failed to cancel delivery note');
    } finally {
      setCancellationLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this delivery note? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteDeliveryNote(id!);
      navigate('/supplier-delivery-notes');
    } catch (err) {
      console.error('Delete error:', err);
      alert(`Failed to delete delivery note: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const handleDownload = () => {
    // Generate PDF download
    const content = generatePDFContent();
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delivery-note-${deliveryNote?.delivery_note_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePDFContent = () => {
    // Simple text content for PDF generation
    // In a real app, you'd use a proper PDF library
    return `
DELIVERY NOTE

Number: ${deliveryNote?.delivery_note_number}
Supplier: ${getSupplierName()}
Delivery Date: ${formatDate(deliveryNote?.delivery_date || '')}
Status: ${deliveryNote?.status}

Items:
${deliveryNote?.supplier_delivery_note_items?.map(item => 
  `- ${item.item_reference} - ${item.item_name}
    Delivered: ${item.quantity_delivered}
    Accepted: ${item.quantity_accepted}
    Unit Price: ${formatCurrency(item.unit_price_ht)}
    Total: ${formatCurrency(item.total_price_ht)}`
).join('\n')}

Total HT: ${formatCurrency(deliveryNote?.total_amount_ht || 0)}
Total TTC: ${formatCurrency(deliveryNote?.total_amount_ttc || 0)}
    `.trim();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading delivery note</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!deliveryNote) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Delivery note not found</h3>
        <p className="mt-1 text-sm text-gray-500">The delivery note you're looking for doesn't exist.</p>
      </div>
    );
  }

  const items =
    deliveryNote.supplier_delivery_note_items ??
    ((deliveryNote as any).items ?? []);

  const itemsCount = items.length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/supplier-delivery-notes')}
                className="mr-4 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Bon de livraison {deliveryNote.delivery_note_number}
                </h1>
                <p className="text-gray-600">Détails et gestion du bon de livraison fournisseur</p>
              </div>
            </div>
            <div className="flex space-x-2">
              {deliveryNote.status === 'draft' && (
                <>
                  <button
                    onClick={() => navigate(`/supplier-delivery-notes/${id}/edit`)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </button>
                  <button
                    onClick={handleValidate}
                    disabled={validationLoading}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {validationLoading ? 'Validation en cours...' : 'Valider'}
                  </button>
                </>
              )}
              
              {deliveryNote.status === 'validated' && (
                <>
                  <button
                    onClick={() => navigate(`/inventory/manage?tab=supplier-invoices&deliveryNoteId=${id}&create=true`)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Convertir en facture
                  </button>
                </>
              )}
              
              {(deliveryNote.status !== 'cancelled' &&
                (deliveryNote.status !== 'invoiced' ||
                  !(
                    Array.isArray(deliveryNote.delivery_note_invoices) &&
                    deliveryNote.delivery_note_invoices.length > 0
                  ))) && (
                <button
                  onClick={handleCancel}
                  disabled={cancellationLoading}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {cancellationLoading ? 'Annulation en cours...' : 'Annuler'}
                </button>
              )}
              
              {(deliveryNote.status === 'draft' || deliveryNote.status === 'cancelled') && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Suppression en cours...' : 'Supprimer'}
                </button>
              )}
              
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </button>
              
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </button>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Statut</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {getStatusBadge(deliveryNote.status)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Fournisseur</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {getSupplierName()}
              </dd>
            </div>
            {deliveryNote.purchase_order_id && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Bon de commande</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <button 
                    onClick={() => navigate('/inventory/manage?tab=purchase-orders')}
                    className="text-blue-600 hover:underline"
                  >
                    Voir le BC lié
                  </button>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Date de livraison</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <Calendar className="inline h-4 w-4 mr-1" />
                {formatDate(deliveryNote.delivery_date)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Créé le</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <User className="inline h-4 w-4 mr-1" />
                {formatDate(deliveryNote.created_at)}
              </dd>
            </div>
          </div>

          {deliveryNote.notes && (
            <div className="mt-4">
              <dt className="text-sm font-medium text-gray-500">Notes</dt>
              <dd className="mt-1 text-sm text-gray-900">{deliveryNote.notes}</dd>
            </div>
          )}

          {deliveryNote.validated_at && (
            <div className="mt-4">
              <dt className="text-sm font-medium text-gray-500">Validé le</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <CheckCircle className="inline h-4 w-4 mr-1" />
                {formatDate(deliveryNote.validated_at || '')}
              </dd>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Articles</h2>
          <p className="text-sm text-gray-600">
            {itemsCount} article(s) dans ce bon de livraison
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Désignation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Livré
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Accepté
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix unitaire HT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total HT
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{item.item_reference}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{item.item_name}</div>
                    {item.notes && (
                      <div className="text-xs text-gray-500">{item.notes}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{item.quantity_delivered}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{item.quantity_accepted}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{formatCurrency(item.unit_price_ht)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(item.total_price_ht)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end">
            <div className="w-64">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sous-total HT :</span>
                  <span className="font-medium">{formatCurrency(deliveryNote.total_amount_ht)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">TVA ({deliveryNote.tva_rate}%):</span>
                  <span className="font-medium">
                    {formatCurrency(deliveryNote.total_amount_ttc - deliveryNote.total_amount_ht)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total TTC :</span>
                  <span className="text-green-600">{formatCurrency(deliveryNote.total_amount_ttc)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

          {/* Invoice Information */}
      {deliveryNote.delivery_note_invoices && deliveryNote.delivery_note_invoices.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Factures liées</h2>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-4">
              {deliveryNote.delivery_note_invoices.map((invoice, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Facture {invoice.invoices?.invoice_number}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Date : {formatDate(invoice.invoices?.invoice_date || '')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(invoice.allocated_amount_ttc || 0)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getStatusBadge(invoice.invoices?.status || 'draft')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {isPrinting && deliveryNote && (
        <PrintableSupplierDeliveryNote
          deliveryNote={deliveryNote}
          supplierName={getSupplierName()}
        />
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
                Confirmer l'annulation
              </h2>
              <button 
                onClick={() => setShowCancelModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Veuillez indiquer la raison de l'annulation de ce bon de livraison.
            </p>
            
            <div className="mb-6">
              <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700 mb-1">
                Raison de l'annulation
              </label>
              <textarea
                id="cancelReason"
                rows={3}
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Ex: Erreur de saisie, Commande annulée..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={cancellationLoading || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {cancellationLoading ? (
                  <>
                    <Clock className="animate-spin h-4 w-4 mr-2" />
                    Annulation...
                  </>
                ) : (
                  'Confirmer l\'annulation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryNoteDetail;
