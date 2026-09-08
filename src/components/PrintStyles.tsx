import { useEffect } from 'react'

interface PrintStylesProps {
  isVisible: boolean
}

export const PrintStyles: React.FC<PrintStylesProps> = ({ isVisible }) => {
  useEffect(() => {
    if (isVisible) {
      // Add print-specific styles
      const style = document.createElement('style')
      style.id = 'print-styles'
      style.textContent = `
        @media print {
          @page {
            size: auto;
            margin: 0mm;
          }

          body {
            background-color: #fff;
            margin: 0;
            padding: 0;
          }

          body * {
            visibility: hidden;
          }
          
          .print-container, .print-container * {
            visibility: visible;
          }
          
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px !important;
            background-color: white;
            z-index: 9999;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-header {
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .print-footer {
            border-top: 1px solid #000;
            padding-top: 20px;
            margin-top: 30px;
            font-size: 12px;
            page-break-inside: avoid;
            page-break-before: avoid;
          }
          
          .print-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .print-table th,
          .print-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          
          .print-table tr {
            page-break-inside: avoid;
          }
          
          .print-table th {
            background-color: #f0f0f0 !important;
            font-weight: bold;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-totals {
            margin-left: auto;
            width: 300px;
          }
          
          .print-section {
            margin-bottom: 20px;
          }
          
          .print-section h2 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
          }
          
          .print-company-info {
            text-align: right;
            font-size: 14px;
          }
          
          .print-invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          
          .print-payment-status {
            padding: 10px;
            border: 2px solid #000;
            text-align: center;
            font-weight: bold;
            margin: 20px 0;
          }
          
          .print-payment-status.paid {
            border-color: #28a745;
            color: #28a745;
          }
          
          .print-payment-status.unpaid {
            border-color: #dc3545;
            color: #dc3545;
          }
          
          .print-payment-status.partial {
            border-color: #ffc107;
            color: #ffc107;
          }
        }
      `
      document.head.appendChild(style)
    }

    return () => {
      // Clean up styles when component unmounts
      const existingStyle = document.getElementById('print-styles')
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [isVisible])

  return null
}
