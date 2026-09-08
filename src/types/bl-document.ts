import { Supplier } from './inventory'

export interface BLDocument {
  _id: string
  blNumber: string
  supplierId: Supplier
  blDate: string
  amount: number
  currency: string
  status: 'draft' | 'validated' | 'invoiced' | 'cancelled'
  originalFilename: string
  fileSize: number
  documentPath: string
  uploadedBy: {
    name: string
  }
  uploadedAt: string
}
