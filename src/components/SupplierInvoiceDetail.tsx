import React, { useMemo, useState } from 'react';
import { SupplierInvoice } from '../types/inventory';
import { formatCurrency, formatDate } from '../utils/formatters';
import { X, Download, Mail, Printer, DollarSign, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useInventoryStore } from '../stores/inventoryStore';
import { PrintableSupplierInvoice } from './PrintableSupplierInvoice';

interface SupplierInvoiceDetailProps {
  invoice: SupplierInvoice;
  onClose: () => void;
  onEdit?: () => void;
}

export const SupplierInvoiceDetail: React.FC<SupplierInvoiceDetailProps> = ({
  invoice,
  onClose,
  onEdit
}) => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'other'>('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const store = useInventoryStore();
  const current = store.getSupplierInvoiceById(invoice.id) || invoice;
  const isOverdue = current.paymentStatus === 'unpaid' && new Date(current.dueDate) < new Date();
  const remainingAmount = current.totalAmount - (current.paidAmount || 0);

  // Related POs lookup inside component
  const { purchaseOrders } = useInventoryStore();
  const relatedPOs = useMemo(() => {
    const ids: string[] = invoice.purchaseOrderIds || [];
    return ids
      .map((poId: string) => purchaseOrders.find((po) => po.id === poId))
      .filter((po): po is typeof purchaseOrders[number] => !!po);
  }, [invoice.purchaseOrderIds, purchaseOrders]);

  const poItemMap = useMemo(() => {
    const map: Record<string, { poUnitCost: number; poQtyOrdered: number; poQtyReceived: number }> = {};
    relatedPOs.forEach((po) => {
      po.items.forEach((item) => {
        map[item.sku] = {
          poUnitCost: item.unitCost,
          poQtyOrdered: item.quantityOrdered,
          poQtyReceived: item.quantityReceived,
        };
      });
    });
    return map;
  }, [relatedPOs]);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const handleEmail = () => {
    // In a real application, this would open an email client or send via API
    alert('Email functionality would be implemented here');
  };

  const handleDownload = () => {
    // In a real application, this would generate and download a PDF
    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      supplierName: invoice.supplierName,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      items: invoice.items,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
      paymentStatus: invoice.paymentStatus
    };
    
    const dataStr = JSON.stringify(invoiceData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice_${invoice.invoiceNumber}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAddPayment = () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (parseFloat(paymentAmount) > remainingAmount) {
      alert('Payment amount cannot exceed remaining balance');
      return;
    }

    try {
      store.recordInvoicePayment(current.id, {
        amount: parseFloat(paymentAmount),
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod,
        reference: paymentReference || undefined
      });
      alert(`Payment of ${formatCurrency(parseFloat(paymentAmount))} recorded successfully!`);
    } catch (e) {
      alert('Failed to record payment');
      return;
    }
    setShowPaymentForm(false);
    setPaymentAmount('');
    setPaymentReference('');
    setPaymentNotes('');
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Supplier Invoice Details
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:text-gray-800"
              title="Print Invoice"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              onClick={handleEmail}
              className="p-2 text-gray-600 hover:text-gray-800"
              title="Email Invoice"
            >
              <Mail className="h-5 w-5" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-gray-800"
              title="Download Invoice"
            >
              <Download className="h-5 w-5" />
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Invoice Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Invoice Number</p>
                  <p className="text-lg font-semibold text-blue-900">{invoice.invoiceNumber}</p>
                </div>
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Total Amount</p>
                  <p className="text-lg font-semibold text-green-900">{formatCurrency(invoice.totalAmount)}</p>
                </div>
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Paid Amount</p>
                  <p className="text-lg font-semibold text-yellow-900">{formatCurrency(invoice.paidAmount)}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-yellow-500" />
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Remaining</p>
                  <p className="text-lg font-semibold text-red-900">{formatCurrency(remainingAmount)}</p>
                </div>
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </div>

          {/* Status Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                    {invoice.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.paymentStatus)}`}>
                    {invoice.paymentStatus.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                {isOverdue && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Overdue:</span>
                    <span className="text-red-600 font-medium">Yes</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Supplier Information</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-600">Supplier:</span>
                  <span className="ml-2 font-medium">{invoice.supplierName}</span>
                </div>
                {invoice.supplierContact && (
                  <div>
                    <span className="text-gray-600">Contact:</span>
                    <span className="ml-2">{invoice.supplierContact}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Invoice Date:</span>
                  <span className="ml-2">{formatDate(invoice.invoiceDate)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Due Date:</span>
                  <span className="ml-2">{formatDate(invoice.dueDate)}</span>
                </div>
              </div>
            </div>
        </div>

        {/* Invoice Items */}
          <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.items.map((item, index) => {
                    const rawItem: any = item as any;
                    const key =
                      item.id ||
                      rawItem._id ||
                      `${index}`;
                    const displayName =
                      item.itemName ||
                      rawItem.inventoryItem?.name ||
                      '-';
                    const description =
                      item.description ||
                      rawItem.inventoryItem?.description ||
                      '-';
                    const quantityRaw =
                      rawItem.quantity !== undefined
                        ? rawItem.quantity
                        : item.quantity;
                    const unitPriceRaw =
                      rawItem.unitPrice !== undefined
                        ? rawItem.unitPrice
                        : item.unitPrice;
                    const quantity = Number(
                      typeof quantityRaw === 'string'
                        ? quantityRaw.replace(',', '.')
                        : quantityRaw ?? 0
                    ) || 0;
                    const unitPrice = Number(
                      typeof unitPriceRaw === 'string'
                        ? unitPriceRaw.replace(',', '.')
                        : unitPriceRaw ?? 0
                    ) || 0;
                    const totalPriceRaw =
                      (item as any).totalPrice ?? rawItem.totalPrice;
                    const lineTotal =
                      typeof totalPriceRaw === 'number'
                        ? totalPriceRaw
                        : Number(totalPriceRaw) || quantity * unitPrice;
                    const sku = item.sku || rawItem.sku || rawItem.inventoryItem?.sku;
                    const varianceDisplay = (() => {
                      if (!sku) return '-';
                      const poInfo = poItemMap[sku];
                      if (!poInfo) return '-';
                      const variance = unitPrice - poInfo.poUnitCost;
                      return Math.abs(variance) > 0 ? formatCurrency(variance) : '-';
                    })();

                    return (
                      <tr key={key}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {displayName}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {description}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {quantity}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(unitPrice)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {varianceDisplay}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
            </table>
          </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {(() => {
                        const firstItem = invoice.items[0] as any | undefined;
                        const rateValue =
                          firstItem && firstItem.taxRate !== undefined
                            ? firstItem.taxRate
                            : undefined;
                        const numericRate = Number(
                          typeof rateValue === 'string'
                            ? rateValue.replace(',', '.')
                            : rateValue ?? 0
                        );
                        const percent =
                          Number.isFinite(numericRate) && numericRate > 0 && numericRate <= 1
                            ? numericRate * 100
                            : numericRate;
                        const safePercent = Number.isFinite(percent) ? percent : 0;
                        return `Tax (${safePercent}%):`;
                      })()}
                    </span>
                    <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(invoice.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment History</h3>
              <div className="space-y-3">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{formatCurrency(payment.amount)}</div>
                      <div className="text-sm text-gray-600">
                        {formatDate(payment.paymentDate)} - {payment.paymentMethod}
                      </div>
                      {payment.notes && (
                        <div className="text-sm text-gray-500 mt-1">{payment.notes}</div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      By: {payment.createdBy}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Notes</h3>
              <p className="text-gray-700">{invoice.notes}</p>
            </div>
          )}

          {/* Documents */}
          {invoice.documents && invoice.documents.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Documents</h3>
              <div className="space-y-2">
                {invoice.documents.map((doc) => (
                  <div key={doc.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="font-medium">{doc.type || 'Document'}</div>
                        <div className="text-sm text-gray-600">
                          {formatDate(doc.uploadedAt)} - {(doc as any).fileSize || 'Unknown size'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => alert(`Download ${doc.type || 'Document'}`)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Payment Form */}
          {remainingAmount > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Payment</h3>
                <button
                  onClick={() => setShowPaymentForm(!showPaymentForm)}
                  className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>{showPaymentForm ? 'Cancel' : 'Add Payment'}</span>
                </button>
              </div>

              {showPaymentForm && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={remainingAmount}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={formatCurrency(remainingAmount)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Method
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="cash">Cash</option>
                        <option value="check">Check</option>
                        <option value="transfer">Bank Transfer</option>
                        <option value="card">Credit Card</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reference (optional)
                      </label>
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Cheque #, Bank ref, etc."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Payment notes..."
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddPayment}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Record Payment
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Related Purchase Orders */}
        {relatedPOs.length > 0 && (
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Related Purchase Orders</h3>
            <div className="space-y-3">
              {relatedPOs.map((po) => (
                <div key={po!.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">PO {po.orderNumber}</div>
                      <div className="text-xs text-gray-600">Supplier: {po.supplierName}</div>
                    </div>
                    <a
                      href={`/inventory/manage?tab=purchase-orders&po=${po.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View PO
                    </a>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div>Ordered: {po.items.reduce((s: number, it) => s + it.quantityOrdered, 0)}</div>
                    <div>Received: {po.items.reduce((s: number, it) => s + it.quantityReceived, 0)}</div>
                    <div>Status: <span className="font-medium">{po.status.replace('_',' ')}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {isPrinting && (
        <PrintableSupplierInvoice invoice={invoice} />
      )}
    </div>
  );
};
