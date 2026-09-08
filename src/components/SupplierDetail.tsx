import React, { useState, useMemo } from 'react';
import { X, FileText, ShoppingCart, RotateCcw, DollarSign, TrendingUp, Calendar, Phone, Mail, MapPin, Building, User, CheckCircle, AlertCircle } from 'lucide-react';
import { Supplier, PurchaseOrder, SupplierInvoice, ReturnOrder } from '../types/inventory';
import { formatDate, formatCurrency } from '../utils/formatters';

interface SupplierDetailProps {
  supplier: Supplier;
  purchaseOrders: PurchaseOrder[];
  supplierInvoices: SupplierInvoice[];
  returnOrders: ReturnOrder[];
  onClose: () => void;
  onEditSupplier: (supplier: Supplier) => void;
  onCreatePurchaseOrder: (supplierId: string) => void;
  onCreateSupplierInvoice: (supplierId: string) => void;
  onViewPurchaseOrder: (orderId: string) => void;
  onViewSupplierInvoice: (invoiceId: string) => void;
  onViewReturnOrder: (returnId: string) => void;
}

type TabType = 'overview' | 'purchase-orders' | 'invoices' | 'returns' | 'analytics';

export const SupplierDetail: React.FC<SupplierDetailProps> = ({
  supplier,
  purchaseOrders,
  supplierInvoices,
  returnOrders,
  onClose,
  onEditSupplier,
  onCreatePurchaseOrder,
  onCreateSupplierInvoice,
  onViewPurchaseOrder,
  onViewSupplierInvoice,
  onViewReturnOrder,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Filter related documents by supplier
  const supplierPurchaseOrders = useMemo(() => 
    purchaseOrders.filter(po => po.supplierId === supplier.id),
    [purchaseOrders, supplier.id]
  );

  const supplierInvoicesFiltered = useMemo(() => 
    supplierInvoices.filter(invoice => invoice.supplierId === supplier.id),
    [supplierInvoices, supplier.id]
  );

  const supplierReturnOrders = useMemo(() => 
    returnOrders.filter(ro => ro.supplierId === supplier.id),
    [returnOrders, supplier.id]
  );

  // Calculate spending analytics
  const spendingAnalytics = useMemo(() => {
    const totalSpent = supplierInvoicesFiltered
      .filter(invoice => invoice.paymentStatus === 'paid')
      .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

    const outstandingAmount = supplierInvoicesFiltered
      .filter(invoice => invoice.paymentStatus === 'unpaid' || invoice.paymentStatus === 'partially_paid')
      .reduce((sum, invoice) => sum + (invoice.totalAmount - (invoice.payments?.reduce((pSum, payment) => pSum + payment.amount, 0) || 0)), 0);

    const thisYearSpent = supplierInvoicesFiltered
      .filter(invoice => {
        const invoiceDate = new Date(invoice.invoiceDate);
        const currentYear = new Date().getFullYear();
        return invoiceDate.getFullYear() === currentYear && invoice.paymentStatus === 'paid';
      })
      .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

    const lastYearSpent = supplierInvoicesFiltered
      .filter(invoice => {
        const invoiceDate = new Date(invoice.invoiceDate);
        const lastYear = new Date().getFullYear() - 1;
        return invoiceDate.getFullYear() === lastYear && invoice.paymentStatus === 'paid';
      })
      .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

    const monthlySpending = supplierInvoicesFiltered
      .filter(invoice => invoice.paymentStatus === 'paid')
      .reduce((acc, invoice) => {
        const month = new Date(invoice.invoiceDate).toLocaleString('default', { month: 'short', year: '2-digit' });
        acc[month] = (acc[month] || 0) + invoice.totalAmount;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalSpent,
      outstandingAmount,
      thisYearSpent,
      lastYearSpent,
      monthlySpending,
      orderCount: supplierPurchaseOrders.length,
      invoiceCount: supplierInvoicesFiltered.length,
      returnCount: supplierReturnOrders.length
    };
  }, [supplierInvoicesFiltered, supplierPurchaseOrders.length, supplierReturnOrders.length]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'sent': return 'text-blue-600 bg-blue-100';
      case 'received': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'paid': return 'text-green-600 bg-green-100';
      case 'unpaid': return 'text-red-600 bg-red-100';
      case 'partially_paid': return 'text-yellow-600 bg-yellow-100';
      case 'requested': return 'text-blue-600 bg-blue-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'processed': return 'text-purple-600 bg-purple-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'returns', label: 'Returns', icon: RotateCcw },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <Building className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{supplier.name}</h2>
              <p className="text-sm text-gray-500">{supplier.isPreferred ? 'Preferred Supplier' : 'Regular Supplier'} • {supplier.status}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onEditSupplier(supplier)}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              Edit Supplier
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(spendingAnalytics.totalSpent)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(spendingAnalytics.outstandingAmount)}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Year</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(spendingAnalytics.thisYearSpent)}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{spendingAnalytics.orderCount}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.id === 'purchase-orders' && (
                    <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                      {supplierPurchaseOrders.length}
                    </span>
                  )}
                  {tab.id === 'invoices' && (
                    <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                      {supplierInvoicesFiltered.length}
                    </span>
                  )}
                  {tab.id === 'returns' && (
                    <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                      {supplierReturnOrders.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Primary Contact</p>
                        <p className="font-medium">{supplier.contactPerson}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium">{supplier.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{supplier.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Address</p>
                        <p className="font-medium">{supplier.address}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Building className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Business Details</p>
                        <p className="font-medium">{supplier.isPreferred ? 'Preferred Supplier' : 'Regular Supplier'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(supplier.status || 'active')}`}>
                          {supplier.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {supplierPurchaseOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <ShoppingCart className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">PO {order.orderNumber}</p>
                          <p className="text-sm text-gray-500">{formatDate(order.orderDate)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatCurrency(order.totalAmount)}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {supplierPurchaseOrders.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No recent purchase orders</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'purchase-orders' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Purchase Orders</h3>
                <button
                  onClick={() => onCreatePurchaseOrder(supplier.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Purchase Order
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supplierPurchaseOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.orderDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => onViewPurchaseOrder(order.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                    {supplierPurchaseOrders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No purchase orders found for this supplier
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Supplier Invoices</h3>
                <button
                  onClick={() => onCreateSupplierInvoice(supplier.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Invoice
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supplierInvoicesFiltered.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(invoice.invoiceDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.paymentStatus)}`}>
                            {invoice.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => onViewSupplierInvoice(invoice.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                    {supplierInvoicesFiltered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No invoices found for this supplier
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'returns' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Return Orders</h3>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supplierReturnOrders.map((returnOrder) => (
                      <tr key={returnOrder.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {returnOrder.returnNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(returnOrder.returnDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(returnOrder.status)}`}>
                            {returnOrder.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {returnOrder.returnReason.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(returnOrder.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => onViewReturnOrder(returnOrder.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                    {supplierReturnOrders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          No return orders found for this supplier
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Spending Analytics</h3>
              
              {/* Year Comparison */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Year-over-Year Comparison</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">This Year</p>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(spendingAnalytics.thisYearSpent)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Last Year</p>
                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(spendingAnalytics.lastYearSpent)}</p>
                  </div>
                </div>
                {spendingAnalytics.lastYearSpent > 0 && (
                  <div className="mt-4 text-center">
                    <span className={`text-sm font-medium ${
                      spendingAnalytics.thisYearSpent > spendingAnalytics.lastYearSpent ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {spendingAnalytics.thisYearSpent > spendingAnalytics.lastYearSpent ? '↑' : '↓'}
                      {Math.abs(((spendingAnalytics.thisYearSpent - spendingAnalytics.lastYearSpent) / spendingAnalytics.lastYearSpent * 100)).toFixed(1)}%
                      {' '}vs last year
                    </span>
                  </div>
                )}
              </div>

              {/* Monthly Spending */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Monthly Spending Trend</h4>
                <div className="space-y-3">
                  {Object.entries(spendingAnalytics.monthlySpending)
                    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
                    .slice(-12)
                    .map(([month, amount]) => (
                      <div key={month} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{month}</span>
                        <div className="flex items-center space-x-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min((amount / Math.max(...Object.values(spendingAnalytics.monthlySpending))) * 100, 100)}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-20 text-right">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      </div>
                    ))
                  }
                  {Object.keys(spendingAnalytics.monthlySpending).length === 0 && (
                    <p className="text-gray-500 text-center py-8">No spending data available</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};