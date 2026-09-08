/**
 * Invoice Generation Monitoring System Types
 * Comprehensive tracking and monitoring for invoice operations
 */

// Validation severity levels
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

// Performance metrics for invoice operations
export interface InvoicePerformanceMetrics {
  operationType: 'create' | 'update' | 'delete' | 'display' | 'validation'
  duration: number
  timestamp: string
  invoiceId?: string
  success: boolean
  error?: string
  operationId: string
}

// Invoice operation log entry (used by generation service)
export interface InvoiceGenerationLog {
  id: string
  operationType: 'create' | 'update' | 'delete' | 'display' | 'validation'
  status: 'started' | 'success' | 'failed' | 'warning'
  details: Record<string, any>
  timestamp: string
}

// Error details for invoice operations
export interface InvoiceOperationError {
  code: string
  message: string
  details?: Record<string, any>
  stack?: string
  retryable: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// Invoice validation result
export interface InvoiceValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  timestamp: string
  duration: number
  dataHash: string
}

// Individual validation error type used by validator
export interface ValidationError {
  field: string
  message: string
  code: string
  severity: ValidationSeverity
}

// Backwards-compatible warning type alias
export interface InvoiceValidationWarning {
  field: string
  message: string
  code: string
}

// Invoice creation request with validation
export interface InvoiceCreationRequest {
  invoiceData: any
  validation: InvoiceValidationResult
  requestId: string
  timestamp: string
  userId?: string
}

// Invoice generation response
export interface InvoiceGenerationResponse {
  success: boolean
  invoiceId?: string
  invoice?: any
  validation?: InvoiceValidationResult
  error?: InvoiceOperationError
  warnings?: InvoiceValidationWarning[]
  performance?: InvoicePerformanceMetrics
  verification?: InvoiceVerificationResult
}

// Verification result for generated invoices
export interface InvoiceVerificationResult {
  invoiceId: string
  verificationStatus: 'verified' | 'partial' | 'failed'
  checks: InvoiceVerificationCheck[]
  timestamp: string
  verifiedBy?: string
}

// Individual verification check
export interface InvoiceVerificationCheck {
  checkType: 'data_integrity' | 'calculations' | 'references' | 'compliance' | 'display'
  status: 'passed' | 'failed' | 'warning'
  message: string
  details?: Record<string, any>
}

// Database connection status used by generation service
export interface DatabaseConnectionStatus {
  connected: boolean
  responseTime?: number
  lastChecked: string
  error?: string
}

// Invoice display status used by display component
export interface InvoiceDisplayStatus {
  invoiceId: string
  canDisplay: boolean
  requirements?: Record<string, any>
  validationResult?: InvoiceValidationResult
  error?: {
    message: string
    code: string
    details: any[]
    timestamp: string
  }
  operationId: string
  duration: number
}

// Monitoring statistics
export interface InvoiceMonitoringStats {
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  averageOperationTime: number
  errorRate: number
  topErrors: Array<{
    errorCode: string
    count: number
    percentage: number
  }>
  operationBreakdown: Record<string, number>
  last24Hours: {
    operations: number
    successRate: number
    averageTime: number
  }
}

// Operation types
export type InvoiceOperationType = 
  | 'CREATE_INVOICE'
  | 'UPDATE_INVOICE'
  | 'DELETE_INVOICE'
  | 'VALIDATE_INVOICE'
  | 'DISPLAY_INVOICE'
  | 'GENERATE_PDF'
  | 'SEND_INVOICE'
  | 'VERIFY_INVOICE'
  | 'PROCESS_PAYMENT'

// Invoice monitoring configuration
export interface InvoiceMonitoringConfig {
  enabled: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  maxRetries: number
  retryDelay: number
  performanceThresholds: {
    create: number // milliseconds
    update: number
    display: number
    validate: number
  }
  enableMetrics: boolean
  enableLogging: boolean
  enableVerification: boolean
  retentionDays: number
}

// Operation result returned by generation service
export interface InvoiceOperationResult {
  success: boolean
  data?: import('../types').SupplierInvoice
  error?: {
    message: string
    code: string
    details: any[]
    timestamp: string
  }
  operationId: string
  duration: number
  validationResult?: InvoiceValidationResult
  databaseStatus?: DatabaseConnectionStatus
  verificationResult?: { success: boolean; error?: string }
}
