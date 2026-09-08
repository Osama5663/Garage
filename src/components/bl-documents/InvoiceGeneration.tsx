import { useEffect, useState } from 'react'
import { useBLDocuments, useGenerateInvoice } from '../../hooks/useBLDocuments'
import { useSuppliers } from '../../hooks/useSuppliers'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Label } from '../ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Calendar } from '../ui/calendar'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FileText, CalendarIcon, Trash2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Alert, AlertDescription } from '../ui/alert'
import { BLDocument } from '../../types/bl-document'
import type { Supplier } from '../../types/inventory'

interface InvoiceGenerationProps {
  selectedBLIds: string[]
  onClearSelection: () => void
}

export default function InvoiceGeneration({ selectedBLIds = [], onClearSelection }: InvoiceGenerationProps) {
  const [supplierId, setSupplierId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(new Date())
  const [dueDate, setDueDate] = useState<Date | undefined>(() => {
    const date = new Date()
    date.setDate(date.getDate() + 30)
    return date
  })
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { suppliers, fetchSuppliers } = useSuppliers()
  const { data: blDocuments } = useBLDocuments({ supplierId })
  const generateMutation = useGenerateInvoice()

  useEffect(() => {
    const loadSuppliers = async () => {
      setIsLoading(true)
      await fetchSuppliers()
      setIsLoading(false)
    }
    loadSuppliers()
  }, [fetchSuppliers])

  const safeSelectedBLIds = selectedBLIds || []
  const selectedBLs: BLDocument[] =
    (blDocuments as BLDocument[] | undefined)?.filter((doc) => safeSelectedBLIds.includes(doc._id)) || []
  const totalAmount = selectedBLs.reduce((sum: number, bl: BLDocument) => sum + bl.amount, 0)
  const currency = selectedBLs[0]?.currency || 'MAD'

  const handleGenerateInvoice = async () => {
    if (!supplierId || safeSelectedBLIds.length === 0) {
      alert('Veuillez sélectionner un fournisseur et au moins un BL')
      return
    }

    const invoiceDateValue = invoiceDate ?? new Date()
    const dueDateValue = dueDate ?? (() => {
      const date = new Date()
      date.setDate(date.getDate() + 30)
      return date
    })()

    generateMutation.mutate(
      {
        supplierId,
        blDocumentIds: safeSelectedBLIds,
        invoiceDate: invoiceDateValue.toISOString(),
        dueDate: dueDateValue.toISOString(),
        notes
      },
      {
        onSuccess: () => {
          onClearSelection()
        }
      }
    )
  }

  const removeFromSelection = (_blId: string) => {
    onClearSelection()
  }

  if (isLoading) {
    return <div>Chargement des fournisseurs...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Génération de Facture Mensuelle
        </CardTitle>
        <CardDescription>
          Sélectionnez les BL à inclure dans la facture mensuelle
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {safeSelectedBLIds.length === 0 ? (
            <Alert>
              <AlertDescription>
                Aucun BL sélectionné. Veuillez sélectionner des documents BL depuis le tableau ci-dessus.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Fournisseur</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger id="supplier">
                      <SelectValue placeholder="Sélectionner un fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map((supplier: Supplier) => (
                        <SelectItem key={supplier._id ?? supplier.id} value={supplier._id ?? supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Total de la facture</Label>
                  <div className="text-2xl font-bold text-primary">
                    {totalAmount.toLocaleString()} {currency}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {safeSelectedBLIds.length} BL sélectionné(s)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date de facture</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !invoiceDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {invoiceDate ? format(invoiceDate, "PPP", { locale: fr }) : <span>Sélectionner une date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={invoiceDate}
                        onSelect={setInvoiceDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Date d'échéance</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP", { locale: fr }) : <span>Sélectionner une date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes supplémentaires pour la facture..."
                  className="w-full min-h-[80px] p-2 border rounded-md"
                />
              </div>

              <div className="space-y-4">
                <Label>BLs sélectionnés:</Label>
                <div className="max-h-48 overflow-y-auto border rounded-md p-4">
                  {selectedBLs.map((bl) => (
                    <div key={bl._id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{bl.blNumber}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(bl.blDate), 'dd/MM/yyyy')}
                        </span>
                        <span className="font-medium">
                          {bl.amount.toLocaleString()} {bl.currency}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromSelection(bl._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleGenerateInvoice}
                  disabled={generateMutation.isPending || !supplierId || selectedBLIds.length === 0}
                  className="flex-1"
                >
                  {generateMutation.isPending ? 'Génération...' : 'Générer la facture'}
                </Button>
                <Button
                  variant="outline"
                  onClick={onClearSelection}
                >
                  Annuler la sélection
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
