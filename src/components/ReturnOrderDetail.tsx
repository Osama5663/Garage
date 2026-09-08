import React, { useState } from 'react';
import {
  X,
  Package,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Download,
  Printer,
  Edit3
} from 'lucide-react';
import { ReturnOrder, ReturnOrderStatus } from '../types/inventory';
import { formatDate, formatCurrency } from '../utils/formatters';
import { PrintableReturnOrder } from './PrintableReturnOrder';
import { t } from '../i18n';

interface ReturnOrderDetailProps {
  returnOrder: ReturnOrder;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<ReturnOrder>) => void;
  onProcess?: (id: string) => void;
  currentUserRole: string;
}

export const ReturnOrderDetail: React.FC<ReturnOrderDetailProps> = ({
  returnOrder,
  onClose,
  onUpdate,
  onProcess,
  currentUserRole
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReturnOrder, setEditedReturnOrder] = useState<Partial<ReturnOrder>>(returnOrder);
  const [showStatusHistory, setShowStatusHistory] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const canEdit = ['admin', 'manager'].includes(currentUserRole);
  const canProcess = ['admin', 'manager'].includes(currentUserRole) && returnOrder.status === 'approved';

  const getStatusColor = (status: ReturnOrderStatus) => {
    switch (status) {
      case 'requested': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'defective': return <AlertTriangle className="h-4 w-4" />;
      case 'damaged': return <AlertTriangle className="h-4 w-4" />;
      case 'wrong_item': return <RotateCcw className="h-4 w-4" />;
      case 'excess_inventory': return <Package className="h-4 w-4" />;
      case 'expired': return <Calendar className="h-4 w-4" />;
      case 'quality_issue': return <AlertTriangle className="h-4 w-4" />;
      case 'incorrect_order': return <RotateCcw className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleStatusChange = (newStatus: ReturnOrderStatus) => {
    if (newStatus !== returnOrder.status) {
      onUpdate(returnOrder.id, { status: newStatus });
      setEditedReturnOrder({ ...editedReturnOrder, status: newStatus });
    }
  };

  const handleSave = () => {
    onUpdate(returnOrder.id, editedReturnOrder);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedReturnOrder(returnOrder);
    setIsEditing(false);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const handleExport = () => {
    const csvContent = [
      [t('returnOrderDetail.title')],
      [''],
      [t('returnOrderDetail.labels.returnNumber'), returnOrder.returnNumber],
      [t('returnOrderDetail.labels.returnDate'), formatDate(returnOrder.returnDate)],
      [t('returnOrderDetail.labels.supplier'), returnOrder.supplierName],
      ['Status', returnOrder.status],
      [t('returnOrderDetail.labels.reason'), returnOrder.returnReason],
      [t('returnOrderDetail.labels.total'), returnOrder.totalAmount.toFixed(2)],
      [''],
      [t('returnOrderDetail.sections.items')],
      [
        t('returnOrderDetail.table.item'), 
        t('returnOrderDetail.table.sku'), 
        t('returnOrderDetail.table.qty'), 
        t('returnOrderDetail.table.unitCost'), 
        t('returnOrderDetail.table.total'), 
        t('returnOrderDetail.table.condition'), 
        t('returnOrderDetail.table.reason')
      ],
      ...returnOrder.items.map(item => [
        item.itemName,
        item.sku,
        item.quantityReturned.toString(),
        item.unitCost.toFixed(2),
        item.totalCost.toFixed(2),
        item.condition,
        item.conditionNotes || ''
      ])
    ].map(row => Array.isArray(row) ? row.join(',') : row).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${returnOrder.returnNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusHistory = [
    { status: 'requested', date: returnOrder.createdAt, by: returnOrder.createdBy },
    ...(returnOrder.approvedBy ? [{ status: 'approved', date: returnOrder.updatedAt, by: returnOrder.approvedBy }] : []),
    ...(returnOrder.processedBy ? [{ status: 'processed', date: returnOrder.processedDate, by: returnOrder.processedBy }] : []),
    ...(returnOrder.completedDate ? [{ status: 'completed', date: returnOrder.completedDate, by: returnOrder.processedBy }] : [])
  ];

  return (
    <div className="p-6 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">{t('returnOrderDetail.title')}</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(returnOrder.status)}`}>
            {t(`returnOrderDetail.status.${returnOrder.status}`)}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="p-2 text-gray-400 hover:text-gray-600"
            title={t('returnOrderDetail.actions.print')}
          >
            <Printer className="h-5 w-5" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 text-gray-400 hover:text-gray-600"
            title={t('returnOrderDetail.actions.export')}
          >
            <Download className="h-5 w-5" />
          </button>
          {canEdit && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 text-gray-400 hover:text-gray-600"
              title={t('returnOrderDetail.actions.edit')}
            >
              <Edit3 className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600"
            title={t('returnOrderDetail.actions.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Status Update Section */}
      {isEditing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-blue-900 mb-3">Update Status</h3>
          <div className="flex space-x-2">
            {['requested', 'approved', 'processed', 'completed', 'cancelled', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => handleStatusChange(status as ReturnOrderStatus)}
                className={`px-3 py-1 text-xs rounded-full border ${
                  editedReturnOrder.status === status
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                }`}
              >
                {t(`returnOrderDetail.status.${status}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* General Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            {t('returnOrderDetail.sections.general')}
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.returnNumber')}</label>
              <p className="text-sm text-gray-900">{returnOrder.returnNumber}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.returnDate')}</label>
              <p className="text-sm text-gray-900">{formatDate(returnOrder.returnDate)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.supplier')}</label>
              <p className="text-sm text-gray-900">{returnOrder.supplierName}</p>
              {returnOrder.supplierContact && (
                <p className="text-xs text-gray-500">{t('returnOrderDetail.labels.contact')}: {returnOrder.supplierContact}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.reason')}</label>
              <div className="flex items-center">
                {getReasonIcon(returnOrder.returnReason)}
                <span className="ml-2 text-sm text-gray-900">{t(`returnOrderForm.reasons.${returnOrder.returnReason}`)}</span>
              </div>
            </div>
            
            {returnOrder.returnReasonDetails && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.reasonDetails')}</label>
                <p className="text-sm text-gray-900">{returnOrder.returnReasonDetails}</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.method')}</label>
              <p className="text-sm text-gray-900 capitalize">{t(`returnOrderForm.methods.${returnOrder.returnMethod}`)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            {t('returnOrderDetail.sections.financial')}
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.subtotal')}</label>
              <p className="text-sm text-gray-900">{formatCurrency(returnOrder.subtotal)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.tax')}</label>
              <p className="text-sm text-gray-900">{formatCurrency(returnOrder.taxAmount)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.total')}</label>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(returnOrder.totalAmount)}</p>
            </div>
            
            {returnOrder.shippingCost && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.shipping')}</label>
                <p className="text-sm text-gray-900">{formatCurrency(returnOrder.shippingCost)}</p>
              </div>
            )}
            
            {returnOrder.trackingNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.tracking')}</label>
                <p className="text-sm text-gray-900">{returnOrder.trackingNumber}</p>
              </div>
            )}
            
            {returnOrder.carrier && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.carrier')}</label>
                <p className="text-sm text-gray-900">{returnOrder.carrier}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Documents */}
      {(returnOrder.purchaseOrderNumber || returnOrder.supplierInvoiceNumber || returnOrder.deliveryNoteNumber) && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            {t('returnOrderDetail.sections.relatedDocs')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {returnOrder.deliveryNoteNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.deliveryNote')}</label>
                <p className="text-sm text-gray-900">{returnOrder.deliveryNoteNumber}</p>
              </div>
            )}

            {returnOrder.purchaseOrderNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.po')}</label>
                <p className="text-sm text-gray-900">{returnOrder.purchaseOrderNumber}</p>
              </div>
            )}
            
            {returnOrder.supplierInvoiceNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.invoice')}</label>
                <p className="text-sm text-gray-900">{returnOrder.supplierInvoiceNumber}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Package className="h-5 w-5 mr-2" />
          {t('returnOrderDetail.sections.items')} ({returnOrder.items.length})
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('returnOrderDetail.table.item')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('returnOrderDetail.table.sku')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('returnOrderDetail.table.qty')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('returnOrderDetail.table.unitCost')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('returnOrderDetail.table.total')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('returnOrderDetail.table.condition')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('returnOrderDetail.table.reason')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {returnOrder.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.itemName}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.sku}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.quantityReturned}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.unitCost)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium">{formatCurrency(item.totalCost)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 capitalize">{item.condition}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{(item.conditionNotes || '').replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status History */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            {t('returnOrderDetail.sections.history')}
          </h3>
          <button
            onClick={() => setShowStatusHistory(!showStatusHistory)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showStatusHistory ? t('returnOrderDetail.actions.hideHistory') : t('returnOrderDetail.actions.showHistory')}
          </button>
        </div>
        
        {showStatusHistory && (
          <div className="space-y-3">
            {statusHistory.map((entry, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  entry.status === 'completed' ? 'bg-green-500' :
                  entry.status === 'processed' ? 'bg-purple-500' :
                  entry.status === 'approved' ? 'bg-blue-500' :
                  entry.status === 'requested' ? 'bg-yellow-500' :
                  entry.status === 'cancelled' ? 'bg-gray-500' : 'bg-red-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {t(`returnOrderDetail.status.${entry.status}`)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(entry.date || '')} by {entry.by}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Additional Information */}
      {(returnOrder.notes || returnOrder.supplierResponse) && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            {t('returnOrderDetail.sections.additional')}
          </h3>
          
          <div className="space-y-4">
            {returnOrder.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.notes')}</label>
                <p className="text-sm text-gray-900">{returnOrder.notes}</p>
              </div>
            )}
            
            {returnOrder.supplierResponse && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('returnOrderDetail.labels.supplierResponse')}</label>
                <p className="text-sm text-gray-900">{returnOrder.supplierResponse}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        {canProcess && onProcess && (
          <button
            onClick={() => {
              if (window.confirm(t('returnOrderDetail.actions.confirmProcess'))) {
                onProcess(returnOrder.id);
              }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 inline mr-2" />
            {t('returnOrderDetail.actions.process')}
          </button>
        )}
        
        {canEdit && isEditing && (
          <>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t('returnOrderDetail.actions.cancel')}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              {t('returnOrderDetail.actions.save')}
            </button>
          </>
        )}
        
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          {t('returnOrderDetail.actions.close')}
        </button>
      </div>
      
      {isPrinting && (
        <PrintableReturnOrder returnOrder={returnOrder} />
      )}
    </div>
  );
};
