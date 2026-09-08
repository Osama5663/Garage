import { useEffect, useState } from 'react'
import { useUploadBLDocument } from '@/hooks/useBLDocuments'
import { useSuppliers } from '@/hooks/useSuppliers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Upload, CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Supplier } from '@/types/inventory'

interface BLDocumentUploadProps {
  onUploadSuccess?: () => void
}

export default function BLDocumentUpload({ onUploadSuccess }: BLDocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [supplierId, setSupplierId] = useState('')
  const [blNumber, setBlNumber] = useState('')
  const [blDate, setBlDate] = useState<Date>()
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('MAD')
  const [metadata, setMetadata] = useState({
    vehicleCount: '',
    totalWeight: '',
    deliveryDate: '',
    notes: ''
  })

  const { suppliers, fetchSuppliers } = useSuppliers()
  const uploadMutation = useUploadBLDocument()

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile || !supplierId || !blNumber || !blDate || !amount) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    const formData = new FormData()
    formData.append('document', selectedFile)
    formData.append('supplierId', supplierId)
    formData.append('blNumber', blNumber)
    formData.append('blDate', blDate.toISOString())
    formData.append('amount', amount)
    formData.append('currency', currency)
    
    const meta = {
      vehicleCount: metadata.vehicleCount ? parseInt(metadata.vehicleCount) : undefined,
      totalWeight: metadata.totalWeight ? parseFloat(metadata.totalWeight) : undefined,
      deliveryDate: metadata.deliveryDate ? new Date(metadata.deliveryDate) : undefined,
      notes: metadata.notes || undefined
    }
    formData.append('metadata', JSON.stringify(meta))

    uploadMutation.mutate(formData, {
      onSuccess: () => {
        setSelectedFile(null)
        setSupplierId('')
        setBlNumber('')
        setBlDate(undefined)
        setAmount('')
        setCurrency('MAD')
        setMetadata({
          vehicleCount: '',
          totalWeight: '',
          deliveryDate: '',
          notes: ''
        })
        onUploadSuccess?.()
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Ajouter un BL Document
        </CardTitle>
        <CardDescription>
          Téléchargez et catégorisez les documents BL par fournisseur
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Fournisseur *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((supplier: Supplier) => (
                    <SelectItem key={supplier._id ?? supplier.id} value={supplier._id ?? supplier.id}>
                      {supplier.name} ({supplier.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blNumber">Numéro BL *</Label>
              <Input
                id="blNumber"
                value={blNumber}
                onChange={(e) => setBlNumber(e.target.value)}
                placeholder="Entrez le numéro BL"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="blDate">Date BL *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !blDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {blDate ? format(blDate, "PPP", { locale: fr }) : <span>Sélectionner une date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={blDate}
                    onSelect={setBlDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Montant *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Devise</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAD">MAD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Document *</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                required
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicleCount">Nombre de véhicules</Label>
              <Input
                id="vehicleCount"
                type="number"
                value={metadata.vehicleCount}
                onChange={(e) => setMetadata(prev => ({ ...prev, vehicleCount: e.target.value }))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalWeight">Poids total (kg)</Label>
              <Input
                id="totalWeight"
                type="number"
                step="0.01"
                value={metadata.totalWeight}
                onChange={(e) => setMetadata(prev => ({ ...prev, totalWeight: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryDate">Date de livraison</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={metadata.deliveryDate}
                onChange={(e) => setMetadata(prev => ({ ...prev, deliveryDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={metadata.notes}
              onChange={(e) => setMetadata(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes supplémentaires..."
              className="w-full min-h-[80px] p-2 border rounded-md"
            />
          </div>

          <Button
            type="submit"
            disabled={uploadMutation.isPending}
            className="w-full"
          >
            {uploadMutation.isPending ? 'Téléchargement...' : 'Télécharger le BL'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
