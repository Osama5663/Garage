import { useState, type ChangeEvent } from 'react'
import { BLDocument } from '../../types/bl-document'
import { useBLDocuments, useUpdateBLStatus } from '../../hooks/useBLDocuments'
import { useSuppliers } from '../../hooks/useSuppliers'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Checkbox } from '../ui/checkbox'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FileText, Search, Download, Eye, CheckCircle, XCircle } from 'lucide-react'

interface BLDocumentsTableProps {
  onSelectionChange?: (selectedIds: string[]) => void
  selectedIds?: string[]
  showSelection?: boolean
}

export default function BLDocumentsTable({ 
  onSelectionChange, 
  selectedIds = [], 
  showSelection = false 
}: BLDocumentsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })

  const { suppliers } = useSuppliers()
  const { data: documents, isLoading } = useBLDocuments({
    supplierId: supplierFilter,
    status: statusFilter,
    startDate: dateRange.start,
    endDate: dateRange.end,
    search: searchTerm
  })
  
  const updateStatusMutation = useUpdateBLStatus()

  const handleSelectAll = (checked: boolean) => {
    if (!documents) return
    
    if (checked) {
      const allIds = documents.map((doc: BLDocument) => doc._id)
      onSelectionChange?.(allIds)
    } else {
      onSelectionChange?.([])
    }
  }

  const handleSelectOne = (checked: boolean, id: string) => {
    if (checked) {
      onSelectionChange?.([...selectedIds, id])
    } else {
      onSelectionChange?.(selectedIds.filter(selectedId => selectedId !== id))
    }
  }

  const handleStatusUpdate = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Brouillon</Badge>
      case 'validated':
        return <Badge className="bg-green-500 hover:bg-green-600">Validé</Badge>
      case 'invoiced':
        return <Badge variant="default">Facturé</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chargement...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents BL
        </CardTitle>
        <CardDescription>
          Gérez et visualisez tous les documents BL reçus des fournisseurs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les fournisseurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les fournisseurs</SelectItem>
                  {suppliers?.map((supplier: import('../../types/inventory').Supplier) => {
                    const supplierValue = supplier._id ?? supplier.id
                    return (
                      <SelectItem key={supplierValue} value={supplierValue}>
                        {supplier.name}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les statuts</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="validated">Validé</SelectItem>
                  <SelectItem value="invoiced">Facturé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Input
                type="date"
                placeholder="Date début"
                value={dateRange.start}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Input
                type="date"
                placeholder="Date fin"
                value={dateRange.end}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par numéro BL ou nom de fichier..."
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {showSelection && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={documents && documents.length > 0 && selectedIds.length === documents.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Numéro BL</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Date BL</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Uploadé par</TableHead>
                  <TableHead>Date upload</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents?.map((blDoc: BLDocument) => (
                  <TableRow key={blDoc._id}>
                    {showSelection && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(blDoc._id)}
                          onCheckedChange={(checked) => handleSelectOne(checked as boolean, blDoc._id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{blDoc.blNumber}</TableCell>
                    <TableCell>{blDoc.supplierId.name}</TableCell>
                    <TableCell>
                      {format(new Date(blDoc.blDate), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {blDoc.amount.toLocaleString()} {blDoc.currency}
                    </TableCell>
                    <TableCell>{getStatusBadge(blDoc.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{blDoc.originalFilename}</div>
                        <div className="text-muted-foreground">
                          {formatFileSize(blDoc.fileSize)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{blDoc.uploadedBy.name}</TableCell>
                    <TableCell>
                      {format(new Date(blDoc.uploadedAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {blDoc.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleStatusUpdate(blDoc._id, 'validated')}
                            title="Valider"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {(blDoc.status === 'draft' || blDoc.status === 'validated') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleStatusUpdate(blDoc._id, 'cancelled')}
                            title="Annuler"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(blDoc.documentPath, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const link = window.document.createElement('a')
                            link.href = blDoc.documentPath
                            link.download = blDoc.originalFilename
                            link.click()
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!documents || documents.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={showSelection ? 10 : 9} className="text-center text-muted-foreground">
                      Aucun document BL trouvé
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
