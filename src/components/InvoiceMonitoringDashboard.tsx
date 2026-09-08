import React, { useState, useEffect } from 'react';
import { InvoiceGenerationService } from '../utils/invoiceGenerationService';
import { InvoiceGenerationLog, InvoicePerformanceMetrics } from '../types/invoice-monitoring';

interface InvoiceMonitoringDashboardProps {
  className?: string;
}

export const InvoiceMonitoringDashboard: React.FC<InvoiceMonitoringDashboardProps> = ({ 
  className = '' 
}) => {
  const [logs, setLogs] = useState<InvoiceGenerationLog[]>([]);
  const [metrics, setMetrics] = useState<InvoicePerformanceMetrics[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMonitoringData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadMonitoringData();
      }, 5000);
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  const loadMonitoringData = async () => {
    try {
      setLoading(true);
      
      const [logsData, metricsData, statsData] = await Promise.all([
        InvoiceGenerationService.getGenerationLogs(50),
        InvoiceGenerationService.getPerformanceMetrics(100),
        InvoiceGenerationService.getMonitoringStats()
      ]);

      setLogs(logsData);
      setMetrics(metricsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (duration: number): string => {
    if (duration < 1000) {
      return `${duration}ms`;
    }
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      started: 'bg-blue-100 text-blue-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getOperationTypeColor = (type: string): string => {
    const colors = {
      create: 'bg-blue-100 text-blue-800',
      update: 'bg-yellow-100 text-yellow-800',
      delete: 'bg-red-100 text-red-800',
      display: 'bg-green-100 text-green-800',
      validation: 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Invoice Generation Monitoring</h2>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Auto-refresh (5s)</span>
              </label>
              <button
                onClick={loadMonitoringData}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Invoice Generation Monitoring</h2>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">Auto-refresh (5s)</span>
            </label>
            <button
              onClick={loadMonitoringData}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.totalOperations}</div>
              <div className="text-sm text-gray-500">Total Operations</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">{stats.successfulOperations}</div>
              <div className="text-sm text-green-700">Successful</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-900">{stats.failedOperations}</div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">{stats.successRate.toFixed(1)}%</div>
              <div className="text-sm text-blue-700">Success Rate</div>
            </div>
          </div>
          
          {stats.averageDuration > 0 && (
            <div className="mt-4 bg-yellow-50 rounded-lg p-4">
              <div className="text-lg font-semibold text-yellow-900">
                Average Duration: {formatDuration(stats.averageDuration)}
              </div>
              <div className="text-sm text-yellow-700">Across all operations</div>
            </div>
          )}
        </div>
      )}

      {/* Operation Type Statistics */}
      {stats?.operationTypeStats && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-4">Operation Type Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(stats.operationTypeStats).map(([type, data]: [string, any]) => (
              <div key={type} className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-900 capitalize">{type.toUpperCase()}</div>
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  <div>Total: {data.total}</div>
                  <div>Success: {data.successful}</div>
                  <div>Rate: {data.successRate.toFixed(1)}%</div>
                  <div>Avg: {formatDuration(data.avgDuration)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Operations Log */}
      <div className="px-6 py-4">
        <h3 className="text-md font-medium text-gray-900 mb-4">Recent Operations</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm">No operations logged yet</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getOperationTypeColor(log.operationType)}`}>
                      {log.operationType}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                      {log.status}
                    </span>
                    {log.details?.invoiceId && (
                      <span className="text-xs text-gray-500">
                        ID: {log.details.invoiceId}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                {log.details?.error && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                    Error: {log.details.error}
                  </div>
                )}
                
                {log.details?.message && (
                  <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                    {log.details.message}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      {metrics.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-4">Recent Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
            {metrics.slice(-12).map((metric) => (
              <div key={metric.operationId} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getOperationTypeColor(metric.operationType)}`}>
                    {metric.operationType.toUpperCase()}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${metric.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {metric.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Duration: {formatDuration(metric.duration)}</div>
                  {metric.invoiceId && <div>Invoice: {metric.invoiceId}</div>}
                  <div>Time: {new Date(metric.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
