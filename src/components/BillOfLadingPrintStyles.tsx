import { useEffect } from 'react'

interface BillOfLadingPrintStylesProps {
  isVisible: boolean
}

export const BillOfLadingPrintStyles: React.FC<BillOfLadingPrintStylesProps> = ({ isVisible }) => {
  useEffect(() => {
    if (isVisible) {
      // Add print-specific styles for Bill of Lading
      const style = document.createElement('style')
      style.id = 'bl-print-styles'
      style.textContent = `
        @media print {
          /* Hide everything except the BL container */
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
            padding: 0.5in !important;
            margin: 0 !important;
            max-width: none !important;
          }
          
          /* Ensure proper page breaks */
          .print-section {
            page-break-inside: avoid;
          }
          
          /* BL-specific table styling */
          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          
          .print-table th,
          .print-table td {
            border: 1px solid #000 !important;
            padding: 8px !important;
            text-align: left;
          }
          
          .print-table th {
            background-color: #f5f5f5 !important;
            font-weight: bold;
            text-align: center;
          }
          
          /* Section headers */
          .print-section h2 {
            font-size: 14px !important;
            font-weight: bold !important;
            margin-bottom: 10px !important;
            border-bottom: 2px solid #000 !important;
            padding-bottom: 5px !important;
            color: #000 !important;
          }
          
          /* Header styling */
          .print-header {
            border-bottom: 3px solid #000 !important;
            padding-bottom: 15px !important;
            margin-bottom: 20px !important;
          }
          
          .print-header h1 {
            font-size: 24px !important;
            font-weight: bold !important;
            color: #000 !important;
          }
          
          /* Company info */
          .print-company-info {
            text-align: right !important;
            font-size: 12px !important;
          }
          
          /* Legal notice box */
          .print-section .border {
            border: 2px solid #000 !important;
            padding: 10px !important;
            margin: 15px 0 !important;
          }
          
          /* Signature lines */
          .print-section .border-b {
            border-bottom: 1px solid #000 !important;
            margin-bottom: 5px !important;
          }
          
          /* Footer */
          .print-footer {
            border-top: 1px solid #000 !important;
            padding-top: 10px !important;
            margin-top: 20px !important;
            font-size: 10px !important;
            text-align: center !important;
          }
          
          /* Ensure text is black for printing */
          .print-container {
            color: #000 !important;
            background: white !important;
          }
          
          /* Remove shadows and effects */
          .print-container * {
            box-shadow: none !important;
            text-shadow: none !important;
          }
          
          /* Font sizes for print */
          .print-container {
            font-size: 11px !important;
            line-height: 1.4 !important;
          }
          
          .print-container .font-sans {
            font-family: Arial, sans-serif !important;
          }
          
          /* Spacing adjustments */
          .mb-6 {
            margin-bottom: 12px !important;
          }
          
          .mb-8 {
            margin-bottom: 16px !important;
          }
          
          .mt-8 {
            margin-top: 16px !important;
          }
          
          .p-4 {
            padding: 8px !important;
          }
          
          .p-8 {
            padding: 16px !important;
          }
          
          .px-3 {
            padding-left: 6px !important;
            padding-right: 6px !important;
          }
          
          .py-2 {
            padding-top: 4px !important;
            padding-bottom: 4px !important;
          }
          
          /* Hide print buttons and other UI elements */
          .no-print, .print-button {
            display: none !important;
          }
          
          /* Page setup */
          @page {
            margin: 0.5in !important;
            size: letter portrait !important;
          }
        }
        
        /* Screen styles for better preview */
        .print-container {
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          border: 1px solid #ddd;
        }
      `
      document.head.appendChild(style)
    }

    return () => {
      // Clean up styles when component unmounts
      const existingStyle = document.getElementById('bl-print-styles')
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [isVisible])

  return null
}

export default BillOfLadingPrintStyles